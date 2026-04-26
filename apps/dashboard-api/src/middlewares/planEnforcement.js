const { Developer, Project, resolveEffectivePlan, getPlanLimits, AppError } = require('@urbackend/common');
const mongoose = require('mongoose');

/**
 * Middleware to load the full Developer document and attach it to req.developer.
 * req.user (from authMiddleware) contains the decoded JWT data.
 */
exports.attachDeveloper = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return next(new AppError(401, 'Unauthorized: Developer context missing'));
        }

        const developer = await Developer.findById(req.user._id);
        if (!developer) {
            return next(new AppError(404, 'Developer not found'));
        }

        req.developer = developer;
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware to check if the developer has reached their project creation limit.
 * Admin bypass uses JWT isAdmin flag (set at login time by auth.controller.js)
 * instead of email string comparison — consistent with existing auth pattern.
 */
exports.checkProjectLimit = async (req, res, next) => {
    try {
        // Admin bypass: check JWT flag OR direct email fallback (to handle stale tokens)
        if (req.user?.isAdmin || req.user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) return next();

        const effectivePlan = resolveEffectivePlan(req.developer);
        const limits = getPlanLimits({
            plan: effectivePlan,
            legacyLimits: {
                maxProjects: req.developer.maxProjects ?? null,
                maxCollections: req.developer.maxCollections ?? null
            }
        });

        // -1 means unlimited
        if (limits.maxProjects === -1) return next();

        // Store limits in req for atomic enforcement in controller
        req.projectLimit = limits.maxProjects;

        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware to check collection limits within a project.
 * Admin bypass uses JWT isAdmin flag (set at login time by auth.controller.js).
 */
exports.checkCollectionLimit = async (req, res, next) => {
    try {
        // Admin bypass: check JWT flag OR direct email fallback (to handle stale tokens)
        if (req.user?.isAdmin || req.user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) return next();

        // For collection creation, the projectId is usually in req.body
        const projectId = req.body.projectId;
        if (!projectId) return next(new AppError(400, 'projectId is required'));

        // Prevent NoSQL Injection (CodeQL Alert: Database query built from user-controlled sources)
        if (typeof projectId !== 'string' || !/^[a-fA-F0-9]{24}$/.test(projectId)) {
            return next(new AppError(400, 'Invalid projectId format'));
        }

        // Load project scoped to the requesting developer to enforce ownership
        const project = await Project.findOne({ _id: projectId, owner: req.developer._id });
        if (!project) return next(new AppError(404, 'Project not found'));

        const effectivePlan = resolveEffectivePlan(req.developer);
        const limits = getPlanLimits({
            plan: effectivePlan,
            customLimits: project.customLimits,
            legacyLimits: {
                maxProjects: req.developer.maxProjects ?? null,
                maxCollections: req.developer.maxCollections ?? null
            }
        });

        if (limits.maxCollections === -1) return next();

        // Store limit in req for atomic enforcement in controller
        req.collectionLimit = limits.maxCollections;

        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware to gate BYOD (Database/Storage) features.
 * BYOM (MongoDB) is always FREE.
 * BYOS (S3/R2/Supabase) is PRO.
 */
exports.checkByodGate = async (req, res, next) => {
    try {
        // Admin always has access to all features
        if (req.user?.isAdmin || req.user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) return next();

        const { dbUri, storageUrl, storageKey } = req.body;
        
        // If they aren't trying to set external resources, let them pass
        if (!dbUri && !storageUrl && !storageKey) return next();

        const effectivePlan = resolveEffectivePlan(req.developer);
        
        let customLimits = null;
        const rawProjectId = req.params.projectId || req.body.projectId || req.query.projectId;
        if (typeof rawProjectId === 'string' && mongoose.Types.ObjectId.isValid(rawProjectId)) {
            const project = await Project.findById(rawProjectId).select('customLimits').lean();
            if (project) customLimits = project.customLimits;
        }

        const limits = getPlanLimits({ plan: effectivePlan, customLimits });

        // 1. Check BYOM (Database) - This is true for free, so it usually passes
        if (dbUri && !limits.byomEnabled) {
            return next(new AppError(403, 'External Database (BYOM) is not enabled for your plan.'));
        }

        // 2. Check BYOS (Storage) - This is false for free, so it blocks
        if ((storageUrl || storageKey) && !limits.byosEnabled) {
            return next(new AppError(403, 'External Storage (BYOS) is a Pro feature. Please upgrade to connect your own S3/R2 bucket.'));
        }

        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware to block BYOK features (API Keys) for Free tier users.
 * Blocks if body contains resendApiKey or if it's an auth provider update.
 */
exports.checkByokGate = async (req, res, next) => {
    try {
        // Admin always has access to all features
        if (req.user?.isAdmin || req.user?.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) return next();

        const { resendApiKey, github, google } = req.body;
        
        // If they aren't setting keys, let them pass
        const isSettingKeys = resendApiKey || github?.clientSecret || google?.clientSecret;
        if (!isSettingKeys) return next();

        let customLimits = null;
        const rawProjectId = req.params.projectId || req.body.projectId || req.query.projectId;
        if (typeof rawProjectId === 'string' && mongoose.Types.ObjectId.isValid(rawProjectId)) {
            const project = await Project.findById(rawProjectId).select('customLimits').lean();
            if (project) customLimits = project.customLimits;
        }

        const effectivePlan = resolveEffectivePlan(req.developer);
        const limits = getPlanLimits({ plan: effectivePlan, customLimits });

        if (!limits.byokEnabled) {
            return next(new AppError(403, 'Bring Your Own Key (BYOK) is a Pro feature. Please upgrade to connect your own API keys or Auth providers.'));
        }

        next();
    } catch (err) {
        next(err);
    }
};