const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['razorpay'], required: true, default: 'razorpay' },
    providerEventId: { type: String, required: true, unique: true, trim: true },
    eventType: { type: String, required: true },
    providerCreatedAt: { type: Date, default: null },
    providerSubId: { type: String, default: null },
    status: {
      type: String,
      enum: ['processing', 'processed', 'ignored', 'failed'],
      default: 'processing',
    },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
