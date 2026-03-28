const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    req.authUser = null;

    if (req.keyRole === 'secret') {
        return next();
    }

    const authHeader = req.header('Authorization');

    if (!authHeader || !/^bearer\s+/i.test(authHeader)) {
        return next();
    }

    const token = authHeader.replace(/^bearer\s+/i, '');
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, req.project.jwtSecret);
        req.authUser = {
            userId: decoded.userId || decoded._id || decoded.id,
            claims: decoded
        };
    } catch {
        req.authUser = null;
    }

    next();
};
