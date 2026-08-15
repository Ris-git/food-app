const crypto = require('crypto');

function safeEqualHex(actual, expected) {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function verifyCheckoutSignature({ paymentId, subscriptionId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) throw new Error('Missing Razorpay API secret.');
  const expected = crypto.createHmac('sha256', secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');
  return safeEqualHex(signature, expected);
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error('Missing Razorpay webhook secret.');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(signature, expected);
}

module.exports = { verifyCheckoutSignature, verifyWebhookSignature };
