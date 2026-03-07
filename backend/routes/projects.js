const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const verifyEmail = require('../middleware/verifyEmail')
const multer = require('multer');
const storage = multer.memoryStorage();

const {
    createProject,
    getAllProject,
    getSingleProject,
    regenerateApiKey,
    createCollection,
    deleteCollection,
    getData,
    deleteRow,
    insertData,
    editRow,
    uploadFile,
    listFiles,
    deleteFile,
    deleteAllFiles,
    deleteProject,
    updateProject,
    updateExternalConfig,
    deleteExternalDbConfig,
    deleteExternalStorageConfig,
    analytics,
    updateAllowedDomains,
    toggleAuth
} = require("../controllers/project.controller")

const { createAdminUser, resetPassword, getUserDetails, updateAdminUser } = require('../controllers/userAuth.controller');

const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB Limit


// POST REQ FOR CREATE PROJECT
router.post('/', authMiddleware, verifyEmail, createProject);

// GET REQ FOR ALL PROJECTS
router.get('/', authMiddleware, getAllProject);

// GET REQ FOR SINGLE PROJECT
router.get('/:projectId', authMiddleware, getSingleProject);

// PATCH REQ FOR REGENERATE KEY
router.patch('/:projectId/regenerate-key', authMiddleware, regenerateApiKey);

// POST REQ FOR CREATE COLLECTION
router.post('/collection', authMiddleware, verifyEmail, createCollection);

// DELETE REQ FOR COLLECTION
router.delete('/:projectId/collections/:collectionName', authMiddleware, verifyEmail, deleteCollection);

// GET REQ FOR DATA
router.get('/:projectId/collections/:collectionName/data', authMiddleware, getData);

// DELETE REQ FOR ROW
router.delete('/:projectId/collections/:collectionName/data/:id', authMiddleware, deleteRow);

// PATCH REQ FOR EDIT ROW
router.patch('/:projectId/collections/:collectionName/data/:id', authMiddleware, editRow);

// GET REQ FOR FILES
router.get('/:projectId/storage/files', authMiddleware, listFiles);

// POST REQ FOR UPLOAD FILE
router.post('/:projectId/storage/upload', authMiddleware, verifyEmail, upload.single('file'), uploadFile);

// POST REQ FOR DELETE FILE
router.post('/:projectId/storage/delete', authMiddleware, verifyEmail, deleteFile);

// DELETE REQ FOR PROJECT
router.delete('/:projectId', authMiddleware, verifyEmail, deleteProject);

// PATCH REQ FOR UPDATE PROJECT
router.patch('/:projectId', authMiddleware, updateProject);

// PATCH REQ FOR ALLOWED DOMAINS
router.patch('/:projectId/allowed-domains', authMiddleware, verifyEmail, updateAllowedDomains);

// PATCH REQ FOR BYOD CONFIG
router.patch('/:projectId/byod-config', authMiddleware, updateExternalConfig);

// DELETE REQ FOR BYOD DB CONFIG
router.delete('/:projectId/byod-config/db', authMiddleware, deleteExternalDbConfig);

// DELETE REQ FOR BYOD STORAGE CONFIG
router.delete('/:projectId/byod-config/storage', authMiddleware, deleteExternalStorageConfig);

// POST REQ FOR INSERT DATA
router.post('/:projectId/collections/:collectionName/data', authMiddleware, verifyEmail, insertData);

// DELETE REQ FOR ALL FILES
router.delete('/:projectId/storage/files', authMiddleware, deleteAllFiles);

// GET REQ FOR ANALYTICS
router.get('/:projectId/analytics', authMiddleware, analytics);

// PATCH REQ FOR TOGGLE AUTH
router.patch('/:projectId/auth/toggle', authMiddleware, verifyEmail, toggleAuth);

// ADMIN AUTH ROUTES
const checkAuthEnabled = require('../middleware/checkAuthEnabled');
const loadProjectForAdmin = require('../middleware/loadProjectForAdmin');

router.post('/:projectId/admin/users', authMiddleware, loadProjectForAdmin, checkAuthEnabled, createAdminUser);
router.patch('/:projectId/admin/users/:userId/password', authMiddleware, loadProjectForAdmin, checkAuthEnabled, resetPassword);
router.get('/:projectId/admin/users/:userId', authMiddleware, loadProjectForAdmin, checkAuthEnabled, getUserDetails);
router.put('/:projectId/admin/users/:userId', authMiddleware, loadProjectForAdmin, checkAuthEnabled, updateAdminUser);

module.exports = router;