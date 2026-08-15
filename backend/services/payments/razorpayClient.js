const Razorpay = require('razorpay');

let razorpayClient = null;

function getRazorpayClient() {
  if (razorpayClient) return razorpayClient;

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  const missing = [];
  if (!keyId) missing.push('RAZORPAY_KEY_ID');
  if (!keySecret) missing.push('RAZORPAY_KEY_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing Razorpay configuration: ${missing.join(', ')}`);
  }

  if (!keyId.startsWith('rzp_test_')) {
    throw new Error('Milestone 6 only accepts a Razorpay Test Mode key (expected an rzp_test_ key ID).');
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

module.exports = { getRazorpayClient };
