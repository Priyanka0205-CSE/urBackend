const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { createCheckout, handleWebhook } = require('../controllers/billing.controller');

// Create a Lemon Squeezy checkout session (authenticated)
router.post('/checkout', authMiddleware, createCheckout);

// Receive webhook events from Lemon Squeezy (public — validated by HMAC signature)
router.post('/webhook', handleWebhook);

module.exports = router;
