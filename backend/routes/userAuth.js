const express = require('express');
const router = express.Router();
const verifyApiKey = require('../middleware/verifyApiKey');
const checkAuthEnabled = require('../middleware/checkAuthEnabled');
const { signup, login, me, verifyEmail, requestPasswordReset, resetPasswordUser, updateProfile, changePasswordUser } = require('../controllers/userAuth.controller');

// SIGNUP ROUTE
router.post('/signup', verifyApiKey, checkAuthEnabled, signup);

// LOGIN ROUTE
router.post('/login', verifyApiKey, checkAuthEnabled, login);

// GET CURRENT USER
router.get('/me', verifyApiKey, checkAuthEnabled, me);

// EMAIL VERIFICATION
router.post('/verify-email', verifyApiKey, checkAuthEnabled, verifyEmail);

// PASSWORD RESET
router.post('/request-password-reset', verifyApiKey, checkAuthEnabled, requestPasswordReset);
router.post('/reset-password', verifyApiKey, checkAuthEnabled, resetPasswordUser);

// PROFILE MANAGEMENT
router.put('/update-profile', verifyApiKey, checkAuthEnabled, updateProfile);
router.put('/change-password', verifyApiKey, checkAuthEnabled, changePasswordUser);

module.exports = router;