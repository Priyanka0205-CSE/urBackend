// FUNCTION - LOAD PROJECT FOR ADMIN (MIDDLEWARE)
const Project = require('../models/Project');

module.exports = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        if (!projectId) return res.status(400).json({ error: "Project ID is required" });

        const project = await Project.findOne({ _id: projectId, owner: req.user._id });
        if (!project) {
            return res.status(404).json({ error: "Project not found or access denied" });
        }

        req.project = project;
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
