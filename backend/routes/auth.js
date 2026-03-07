const express = require('express');
const router = express.Router();
const authorization = require('../middleware/authMiddleware');
const {
    register,
    login,
    changePassword,
    deleteAccount,
    sendOtp,
    verifyOtp,
    forgotPassword,
    resetPassword
} = require('../controllers/auth.controller');


const { authLimiter } = require('../middleware/auth_limiter');
const rateLimit = require('express-rate-limit');
const dashboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: "Dashboard usage limit exceeded. Slow down!" },
    skip: (req) => process.env.NODE_ENV === 'development',
});


// REGISTER ROUTE
router.post('/register', authLimiter, register);

// LOGIN ROUTE
router.post('/login', authLimiter, login);

// Apply more relaxed dashboard limiter to the rest
router.use(dashboardLimiter);

// CHANGE PASSWORD (Protected)
router.put('/change-password', authorization, changePassword);

// DELETE ACCOUNT (Protected - Danger Zone)
router.delete('/delete-account', authorization, deleteAccount);

// OTP (email verification)
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// PASSWORD RESET (FIX 5)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
