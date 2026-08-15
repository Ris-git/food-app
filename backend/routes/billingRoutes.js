const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');

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

/**
 * GET /billing/my-subscription
 *
 * Returns the authenticated restaurant owner's current subscription,
 * with the full Plan document populated (name, price, limits, etc.).
 *
 * Protected: requires valid JWT with role === 'restaurant'.
 */
router.get('/my-subscription', jwtAuthMiddleware, async (req, res) => {
  try {
    // 1. Find the restaurant owned by the authenticated user
    const restaurant = await Restaurant.findOne({ user: req.user.id });
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for this account.',
      });
    }

    // 2. Find the subscription linked to that restaurant
    //    .populate('plan') replaces the plan ObjectId with the full Plan document
    const subscription = await Subscription.findOne({ restaurant: restaurant._id })
      .populate('plan');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found. Contact support.',
      });
    }

    // 3. Compute trial days remaining (useful for the UI countdown)
    let trialDaysRemaining = null;
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      const msRemaining = subscription.trialEndsAt.getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    return res.status(200).json({
      success: true,
      subscription,
      plan: subscription.plan, // already populated
      trialDaysRemaining,
    });
  } catch (err) {
    console.error('[GET /billing/my-subscription] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription.' });
  }
});

module.exports = router;

