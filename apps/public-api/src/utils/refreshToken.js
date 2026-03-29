const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { redis } = require('@urbackend/common');

const ACCESS_TOKEN_EXPIRES_IN = process.env.PUBLIC_AUTH_ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.PUBLIC_AUTH_REFRESH_TOKEN_TTL_SECONDS || 7 * 24 * 60 * 60);
const REFRESH_SESSION_PREFIX = 'project';

const getRefreshCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000
});

const clearCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
});

const getRefreshSessionKey = (tokenId) => `${REFRESH_SESSION_PREFIX}:auth:refresh:session:${tokenId}`;

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const toProjectIdString = (projectId) => projectId?.toString?.() || String(projectId);

const signAccessToken = (project, userId) =>
    jwt.sign(
        { userId, projectId: project._id },
        project.jwtSecret,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

const generateRefreshToken = () => {
    const tokenId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');
    return {
        tokenId,
        rawToken: `${tokenId}.${secret}`
    };
};

const MAX_IP_LENGTH = 100;

const readRequestIp = (req) => {
    if (req?.ip) {
        return req.ip;
    }

    const headers = req?.headers || {};
    const xffRaw = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
    if (typeof xffRaw === 'string' && xffRaw.length > 0) {
        const firstIp = xffRaw.split(',')[0].trim();
        if (firstIp) {
            return firstIp.slice(0, MAX_IP_LENGTH);
        }
    }

    if (req?.socket?.remoteAddress) {
        return req.socket.remoteAddress;
    }

    return 'unknown';
};

const shouldExposeRefreshToken = (req) => req.header('x-refresh-token-mode') === 'header';

const readRefreshTokenFromRequest = (req) => {
    const fromCookie = req.cookies?.refreshToken || null;
    const fromHeader = req.header('x-refresh-token');
    return fromCookie || fromHeader || null;
};

const parseRefreshToken = (rawToken) => {
    if (!rawToken || typeof rawToken !== 'string') return null;
    const [tokenId, tokenSecret] = rawToken.split('.');
    if (!tokenId || !tokenSecret) return null;
    return { tokenId, tokenSecret };
};

const saveRefreshSession = async ({ tokenId, rawToken, projectId, userId, rotatedFrom = null, isUsed = false, rotatedTo = null }) => {
    const nowIso = new Date().toISOString();
    const session = {
        tokenId,
        projectId: toProjectIdString(projectId),
        userId: String(userId),
        tokenHash: hashRefreshToken(rawToken),
        rotatedFrom,
        rotatedTo,
        isUsed,
        revokedAt: null,
        createdAt: nowIso,
        lastUsedAt: nowIso,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString()
    };
    await redis.set(getRefreshSessionKey(tokenId), JSON.stringify(session), 'EX', REFRESH_TOKEN_TTL_SECONDS);
    return session;
};

const getRefreshSession = async (tokenId) => {
    const raw = await redis.get(getRefreshSessionKey(tokenId));
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const persistRefreshSession = async (session) => {
    const ttl = Math.max(1, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
    await redis.set(getRefreshSessionKey(session.tokenId), JSON.stringify(session), 'EX', ttl);
};

const incrementRateCounter = async (key, windowSeconds) => {
    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, windowSeconds);
    }
    return Number(count);
};

const assertRefreshRateLimits = async ({ req, tokenId, userId }) => {
    const ip = String(readRequestIp(req));
    const ipCount = await incrementRateCounter(`ratelimit:refresh:ip:${ip}`, 60);
    if (ipCount > 30) return { limited: true, message: 'Too many refresh attempts from this IP' };

    if (tokenId) {
        const tokenCount = await incrementRateCounter(`ratelimit:refresh:token:${tokenId}`, 60);
        if (tokenCount > 10) return { limited: true, message: 'Too many refresh attempts for this token' };
    }

    if (userId) {
        const userCount = await incrementRateCounter(`ratelimit:refresh:user:${String(userId)}`, 60);
        if (userCount > 20) return { limited: true, message: 'Too many refresh attempts for this user' };
    }

    return { limited: false };
};

const revokeSessionChain = async (startTokenId) => {
    let currentTokenId = startTokenId;
    const visited = new Set();

    while (currentTokenId && !visited.has(currentTokenId)) {
        visited.add(currentTokenId);
        const session = await getRefreshSession(currentTokenId);
        if (!session) break;
        session.revokedAt = new Date().toISOString();
        session.lastUsedAt = new Date().toISOString();
        await persistRefreshSession(session);
        currentTokenId = session.rotatedTo || null;
    }
};

const clearRefreshCookie = (res) => {
    res.clearCookie('refreshToken', clearCookieOptions());
};

const issueAuthTokens = async ({ project, userId, res, rotatedFrom = null }) => {
    const accessToken = signAccessToken(project, userId);
    const { tokenId, rawToken } = generateRefreshToken();
    await saveRefreshSession({
        tokenId,
        rawToken,
        projectId: project._id,
        userId,
        rotatedFrom
    });

    res.cookie('refreshToken', rawToken, getRefreshCookieOptions());
    return {
        accessToken,
        refreshToken: rawToken,
        tokenId,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN
    };
};

module.exports = {
    assertRefreshRateLimits,
    clearRefreshCookie,
    getRefreshSession,
    hashRefreshToken,
    issueAuthTokens,
    parseRefreshToken,
    readRefreshTokenFromRequest,
    revokeSessionChain,
    shouldExposeRefreshToken,
    persistRefreshSession
};
