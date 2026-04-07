const mongoose = require("mongoose");

const attemptSchema = new mongoose.Schema(
  {
    attemptNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    statusCode: { type: Number },
    responseBody: { type: String, maxlength: 1024 },
    error: { type: String, maxlength: 500 },
    attemptedAt: { type: Date, default: Date.now },
    durationMs: { type: Number },
  },
  { _id: false }
);

const webhookDeliverySchema = new mongoose.Schema(
  {
    webhookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    attempts: {
      type: [attemptSchema],
      default: [],
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    finalStatus: {
      type: String,
      enum: ["pending", "delivered", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

webhookDeliverySchema.index({ projectId: 1, webhookId: 1 });
webhookDeliverySchema.index({ finalStatus: 1, nextRetryAt: 1 });
webhookDeliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model("WebhookDelivery", webhookDeliverySchema);
