const { Queue, Worker } = require('bullmq');
const connection = require('../config/redis');
const { sendAuthOtpEmail } = require('../utils/emailService');

// Create the email queue specifically for fast OTPs
const authEmailQueue = new Queue('auth-email-queue', { connection });

// Initialize Worker with Rate Limiting
const worker = new Worker('auth-email-queue', async (job) => {
    const { email, otp, type, pname } = job.data;
    const redact = (e) => e.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + "*".repeat(gp3.length));
    const maskedEmail = redact(email);

    try {
        console.log(`[Queue] Processing ${type} email for: ${maskedEmail}`);
        await sendAuthOtpEmail(email, { otp, type, pname});
    } catch (error) {
        console.error(`[Queue] Failed to send auth email to ${maskedEmail}:`, error);
        throw error;
    }
}, {
    connection,
    limiter: {
        max: 2,
        duration: 1000, 
    }
});

worker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job.id} failed:`, err);
});

module.exports = { authEmailQueue };
