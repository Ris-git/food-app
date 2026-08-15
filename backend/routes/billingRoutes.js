const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Plan = require('../models/Plan');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const { getRazorpayClient } = require('../services/payments/razorpayClient');
const { verifyCheckoutSignature } = require('../services/payments/razorpaySignatures');

const PAID_PLAN_TOTAL_COUNTS = {
  monthly: 120,
  yearly: 10,
};

/**
 * GET /billing/plans
 *
 * Returns all active subscription plans.
 * Public endpoint — no authentication required.
 * Used by the Billing page to display plan cards.
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true })
      .select('-razorpayPlanId')
      .sort({ price: 1 }); // cheapest first
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
      .select('-providerPlanId -providerSubId -pendingProviderSubId')
      .populate('plan', '-razorpayPlanId');

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

/**
 * POST /billing/subscription
 *
 * Prepares Razorpay Checkout for a paid plan. This deliberately records a
 * pending selection and does not change the restaurant's active entitlement.
 * Webhook verification in Milestone 8 is responsible for activation.
 */
router.post('/subscription', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ success: false, message: 'Restaurant access required.' });
    }

    const restaurant = await Restaurant.findOne({ user: req.user.id })
      .populate('user', 'name email phone');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this account.' });
    }

    if (!mongoose.isValidObjectId(req.body.planId)) {
      return res.status(400).json({ success: false, message: 'A valid plan is required.' });
    }

    const plan = await Plan.findById(req.body.planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'The selected plan is not available.' });
    }
    if (plan.price <= 0 || plan.billingInterval === 'none') {
      return res.status(400).json({ success: false, message: 'Free plans do not require checkout.' });
    }
    if (!plan.razorpayPlanId) {
      return res.status(409).json({ success: false, message: 'This plan is not ready for online checkout.' });
    }

    const totalCount = PAID_PLAN_TOTAL_COUNTS[plan.billingInterval];
    if (!totalCount) {
      return res.status(400).json({ success: false, message: 'Unsupported billing interval.' });
    }

    const subscription = await Subscription.findOne({ restaurant: restaurant._id });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found. Contact support.' });
    }
    if (subscription.status === 'active' && subscription.plan.equals(plan._id)) {
      return res.status(409).json({ success: false, message: 'This is already your active plan.' });
    }

    let providerSubscriptionId = null;
    if (
      subscription.pendingPlan?.equals(plan._id) &&
      subscription.pendingProviderSubId &&
      ['created', 'authenticated'].includes(subscription.pendingProviderStatus)
    ) {
      providerSubscriptionId = subscription.pendingProviderSubId;
    } else {
      const options = {
        plan_id: plan.razorpayPlanId,
        total_count: totalCount,
        quantity: 1,
        customer_notify: true,
        notes: {
          restaurantId: restaurant._id.toString(),
          foodyPlanId: plan._id.toString(),
        },
      };

      if (
        subscription.status === 'trial' &&
        subscription.trialEndsAt &&
        subscription.trialEndsAt.getTime() > Date.now()
      ) {
        options.start_at = Math.floor(subscription.trialEndsAt.getTime() / 1000);
      }

      const providerSubscription = await getRazorpayClient().subscriptions.create(options);
      providerSubscriptionId = providerSubscription.id;

      subscription.pendingPlan = plan._id;
      subscription.pendingProviderSubId = providerSubscription.id;
      subscription.pendingProviderStatus = providerSubscription.status || 'created';
      subscription.pendingCreatedAt = new Date();
      await subscription.save();
    }

    return res.status(201).json({
      success: true,
      checkout: {
        keyId: process.env.RAZORPAY_KEY_ID.trim(),
        subscriptionId: providerSubscriptionId,
        businessName: 'Foody',
        plan: {
          id: plan._id,
          name: plan.name,
          displayName: plan.displayName,
          price: plan.price,
          currency: plan.currency,
          billingInterval: plan.billingInterval,
        },
        prefill: {
          name: restaurant.user?.name || '',
          email: restaurant.user?.email || '',
          contact: restaurant.user?.phone || restaurant.phone || '',
        },
      },
    });
  } catch (err) {
    console.error('[POST /billing/subscription] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to prepare checkout. Please try again.' });
  }
});

/**
 * POST /billing/subscription/verify
 *
 * Verifies the browser Checkout result belongs to this restaurant. Successful
 * authorization is recorded, but paid entitlements still wait for Razorpay's
 * server-to-server activation webhook.
 */
router.post('/subscription/verify', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ success: false, message: 'Restaurant access required.' });
    }

    const paymentId = req.body.razorpay_payment_id;
    const providerSubscriptionId = req.body.razorpay_subscription_id;
    const signature = req.body.razorpay_signature;
    if (!paymentId || !providerSubscriptionId || !signature) {
      return res.status(400).json({ success: false, message: 'Incomplete Checkout verification data.' });
    }

    const restaurant = await Restaurant.findOne({ user: req.user.id });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this account.' });
    }

    const subscription = await Subscription.findOne({ restaurant: restaurant._id });
    if (!subscription || subscription.pendingProviderSubId !== providerSubscriptionId) {
      return res.status(403).json({ success: false, message: 'This Checkout does not belong to your restaurant.' });
    }

    const isValid = verifyCheckoutSignature({
      paymentId,
      subscriptionId: providerSubscriptionId,
      signature,
    });
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Checkout signature verification failed.' });
    }

    subscription.pendingProviderStatus = 'authenticated';
    subscription.authenticatedAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: subscription.status === 'trial'
        ? 'Payment method authorized. Your selected plan will activate after the trial ends.'
        : 'Payment method authorized. Waiting for Razorpay to activate the subscription.',
      activationExpectedAt: subscription.status === 'trial' ? subscription.trialEndsAt : null,
    });
  } catch (err) {
    console.error('[POST /billing/subscription/verify] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to verify Checkout.' });
  }
});

module.exports = router;
