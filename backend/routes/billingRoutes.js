const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');

/**
 * GET /billing/plans
 *
 * Returns all active subscription plans.
 * Public endpoint — no authentication required.
 * Used by the Billing page to display plan cards.
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 }); // cheapest first
    return res.status(200).json({ success: true, plans });
  } catch (err) {
    console.error('[GET /billing/plans] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch plans.' });
  }
});

module.exports = router;
