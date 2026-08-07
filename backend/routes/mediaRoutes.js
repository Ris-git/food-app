const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ImageKit = require('imagekit');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');

// Initialize ImageKit instance if env variables are defined
let imagekit = null;
if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
}

// GET /media/upload-signature - Generate HMAC signature & tokens for client-side uploads
router.get('/upload-signature', jwtAuthMiddleware, (req, res) => {
  try {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || 'public_demo_key';
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || 'private_demo_key';
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/foody_demo';

    if (imagekit) {
      const authParams = imagekit.getAuthenticationParameters();
      return res.status(200).json({
        success: true,
        publicKey,
        urlEndpoint,
        token: authParams.token,
        expire: authParams.expire,
        signature: authParams.signature,
      });
    }

    // Native Node.js crypto fallback HMAC calculation
    const token = req.query.token || crypto.randomUUID();
    const expire = req.query.expire || Math.floor(Date.now() / 1000) + 2400; // 40 mins
    const signature = crypto
      .createHmac('sha1', privateKey)
      .update(token + expire)
      .digest('hex');

    return res.status(200).json({
      success: true,
      publicKey,
      urlEndpoint,
      token,
      expire,
      signature,
    });
  } catch (err) {
    console.error('ImageKit Signature Generation Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate media upload signature.',
      error: err.message,
    });
  }
});

module.exports = router;
