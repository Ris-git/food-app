const express = require('express');
const WebhookEvent = require('../models/WebhookEvent');
const { verifyWebhookSignature } = require('../services/payments/razorpaySignatures');
const { processSubscriptionWebhook } = require('../services/payments/razorpayWebhookService');

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const providerEventId = req.get('x-razorpay-event-id');

  try {
    if (!Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }
    if (!providerEventId) {
      return res.status(400).json({ success: false, message: 'Missing webhook event ID.' });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload.' });
    }

    let webhookEvent = await WebhookEvent.findOne({ providerEventId });
    if (webhookEvent?.status === 'processed' || webhookEvent?.status === 'ignored') {
      return res.status(200).json({ success: true, duplicate: true });
    }

    if (!webhookEvent) {
      try {
        webhookEvent = await WebhookEvent.create({
          providerEventId,
          eventType: payload.event || 'unknown',
          providerCreatedAt: payload.created_at ? new Date(payload.created_at * 1000) : null,
          providerSubId: payload.payload?.subscription?.entity?.id || null,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        webhookEvent = await WebhookEvent.findOne({ providerEventId });
        if (webhookEvent?.status === 'processed' || webhookEvent?.status === 'ignored') {
          return res.status(200).json({ success: true, duplicate: true });
        }
      }
    }

    const result = await processSubscriptionWebhook(payload);
    webhookEvent.status = result.outcome;
    webhookEvent.failureReason = result.reason || null;
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
    return res.status(200).json({ success: true, outcome: result.outcome });
  } catch (error) {
    console.error('[Razorpay webhook] Error:', error.message);
    if (providerEventId) {
      await WebhookEvent.findOneAndUpdate(
        { providerEventId },
        { status: 'failed', failureReason: error.message }
      ).catch(() => null);
    }
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
});

module.exports = router;
