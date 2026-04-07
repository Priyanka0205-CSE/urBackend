const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { verifyEmail } = require("@urbackend/common");

const {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
  testWebhook,
} = require("../controllers/webhook.controller");

// Create webhook
router.post("/:projectId/webhooks", authMiddleware, verifyEmail, createWebhook);

// List all webhooks for a project
router.get("/:projectId/webhooks", authMiddleware, getWebhooks);

// Get single webhook
router.get("/:projectId/webhooks/:webhookId", authMiddleware, getWebhook);

// Update webhook
router.patch("/:projectId/webhooks/:webhookId", authMiddleware, verifyEmail, updateWebhook);

// Delete webhook
router.delete("/:projectId/webhooks/:webhookId", authMiddleware, verifyEmail, deleteWebhook);

// Get delivery history
router.get("/:projectId/webhooks/:webhookId/deliveries", authMiddleware, getDeliveries);

// Test webhook
router.post("/:projectId/webhooks/:webhookId/test", authMiddleware, verifyEmail, testWebhook);

module.exports = router;
