const express = require('express');
const router = express.Router();
const verifyApiKey = require('../middleware/verifyApiKey');
const { checkSchema, createSchema } = require("../controllers/schema.controller");

// GET Route to check if a schema exists
// GET /api/schemas/error_logs
router.get('/:collectionName', verifyApiKey, checkSchema);

// POST Route to create a new schema
// POST /api/schemas
router.post('/', verifyApiKey, createSchema);

module.exports = router;
