const mongoose = require("mongoose");
const {
  Webhook,
  WebhookDelivery,
  Project,
  encrypt,
  decrypt,
  createWebhookSchema,
  updateWebhookSchema,
  generateSignature,
} = require("@urbackend/common");
const crypto = require("crypto");

// Validate MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create a new webhook for a project
 */
module.exports.createWebhook = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Validate input
    const validation = createWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const { name, url, secret, events, enabled } = validation.data;

    // Encrypt the secret
    const encryptedSecret = encrypt(secret);

    const webhook = await Webhook.create({
      projectId,
      name,
      url,
      secret: encryptedSecret,
      events: events || {},
      enabled: enabled !== false,
    });

    // Return without secret
    res.status(201).json({
      message: "Webhook created",
      data: {
        _id: webhook._id,
        projectId: webhook.projectId,
        name: webhook.name,
        url: webhook.url,
        events: Object.fromEntries(webhook.events || new Map()),
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
      },
    });
  } catch (err) {
    console.error("[Webhook] Create error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all webhooks for a project
 */
module.exports.getWebhooks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const webhooks = await Webhook.find({ projectId }).lean();

    // Transform events Map to plain object and exclude secret
    const data = webhooks.map((wh) => ({
      _id: wh._id,
      projectId: wh.projectId,
      name: wh.name,
      url: wh.url,
      events: wh.events || {},
      enabled: wh.enabled,
      createdAt: wh.createdAt,
      updatedAt: wh.updatedAt,
    }));

    res.json({ data });
  } catch (err) {
    console.error("[Webhook] List error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get a single webhook
 */
module.exports.getWebhook = async (req, res) => {
  try {
    const { projectId, webhookId } = req.params;

    if (!isValidId(projectId) || !isValidId(webhookId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const webhook = await Webhook.findOne({
      _id: webhookId,
      projectId,
    }).lean();

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json({
      data: {
        _id: webhook._id,
        projectId: webhook.projectId,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events || {},
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    });
  } catch (err) {
    console.error("[Webhook] Get error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a webhook
 */
module.exports.updateWebhook = async (req, res) => {
  try {
    const { projectId, webhookId } = req.params;

    if (!isValidId(projectId) || !isValidId(webhookId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Validate input
    const validation = updateWebhookSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const { name, url, secret, events, enabled } = validation.data;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (enabled !== undefined) updateData.enabled = enabled;

    // Re-encrypt if secret is being updated
    if (secret !== undefined) {
      updateData.secret = encrypt(secret);
    }

    const webhook = await Webhook.findOneAndUpdate(
      { _id: webhookId, projectId },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    res.json({
      message: "Webhook updated",
      data: {
        _id: webhook._id,
        projectId: webhook.projectId,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events || {},
        enabled: webhook.enabled,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    });
  } catch (err) {
    console.error("[Webhook] Update error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a webhook
 */
module.exports.deleteWebhook = async (req, res) => {
  try {
    const { projectId, webhookId } = req.params;

    if (!isValidId(projectId) || !isValidId(webhookId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const webhook = await Webhook.findOneAndDelete({
      _id: webhookId,
      projectId,
    });

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Optionally clean up delivery logs (or keep for audit)
    // await WebhookDelivery.deleteMany({ webhookId });

    res.json({ message: "Webhook deleted" });
  } catch (err) {
    console.error("[Webhook] Delete error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get delivery history for a webhook
 */
module.exports.getDeliveries = async (req, res) => {
  try {
    const { projectId, webhookId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    if (!isValidId(projectId) || !isValidId(webhookId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Verify webhook belongs to project
    const webhook = await Webhook.findOne({ _id: webhookId, projectId });
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [deliveries, total] = await Promise.all([
      WebhookDelivery.find({ webhookId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WebhookDelivery.countDocuments({ webhookId }),
    ]);

    res.json({
      data: deliveries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("[Webhook] Get deliveries error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Send a test webhook
 */
module.exports.testWebhook = async (req, res) => {
  try {
    const { projectId, webhookId } = req.params;

    if (!isValidId(projectId) || !isValidId(webhookId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      owner: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Load webhook with secret
    const webhook = await Webhook.findOne({ _id: webhookId, projectId }).select(
      "+secret.encrypted +secret.iv +secret.tag"
    );

    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    // Decrypt secret
    let secret;
    try {
      secret = decrypt(webhook.secret);
      if (!secret) throw new Error("Decryption failed");
    } catch (err) {
      return res.status(500).json({ error: "Failed to decrypt webhook secret" });
    }

    // Create test payload
    const testPayload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      projectId: projectId.toString(),
      collection: "test",
      action: "ping",
      documentId: "test-" + crypto.randomUUID(),
      data: {
        message: "This is a test webhook from urBackend",
        triggeredBy: "dashboard",
      },
    };

    const signature = generateSignature(testPayload, secret);
    const startTime = Date.now();

    let statusCode = null;
    let responseBody = null;
    let error = null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for test

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-urBackend-Signature": signature,
          "X-urBackend-Event": "test.ping",
          "X-urBackend-Delivery-Id": "test-" + crypto.randomUUID(),
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      statusCode = response.status;

      try {
        responseBody = await response.text();
        if (responseBody.length > 1024) {
          responseBody = responseBody.substring(0, 1024) + "...";
        }
      } catch {
        responseBody = "[Could not read response body]";
      }
    } catch (err) {
      error = err.name === "AbortError" ? "Request timeout (10s)" : err.message;
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startTime;
    const success = statusCode >= 200 && statusCode < 300;

    res.json({
      success,
      statusCode,
      responseBody,
      error,
      durationMs,
    });
  } catch (err) {
    console.error("[Webhook] Test error:", err);
    res.status(500).json({ error: err.message });
  }
};
