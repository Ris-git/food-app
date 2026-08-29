const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Plan = require('../models/Plan');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const { getRazorpayClient } = require('../services/payments/razorpayClient');
const { verifyCheckoutSignature } = require('../services/payments/razorpaySignatures');
const { reconcileSubscription } = require('../services/subscriptionLifecycleService');
const { resolveOrganizationForUser } = require('../services/organizationAccessService');

const PAID_PLAN_TOTAL_COUNTS = {
  monthly: 120,
  yearly: 10,
};

async function getBillingAccount(req) {
  const requestedOrganizationId = req.headers['x-organization-id'] || req.body?.organizationId || req.query?.organizationId;
  const resolved = await resolveOrganizationForUser(req.user, requestedOrganizationId || null);
  if (resolved) {
    if (!resolved.isSystemAdmin && resolved.membership?.role !== 'OWNER') return { forbidden: true };
    const restaurant = await Restaurant.findOne({ organization: resolved.organization._id, lifecycleStatus: 'ACTIVE' })
      .sort({ createdAt: 1 }).populate('user', 'name email phone');
    const subscription = await Subscription.findOne({ organization: resolved.organization._id });
    return { organization: resolved.organization, restaurant, subscription };
  }

  // Temporary fallback for databases that have not run migrate:organizations.
  const restaurant = await Restaurant.findOne({ user: req.user.id }).populate('user', 'name email phone');
  const subscription = restaurant ? await Subscription.findOne({ restaurant: restaurant._id }) : null;
  return { organization: null, restaurant, subscription };
}

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
    const account = await getBillingAccount(req);
    if (account.forbidden) return res.status(403).json({ success: false, message: 'Only an organization owner can manage billing.' });
    const restaurant = account.restaurant;
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'No restaurant found for this account.',
      });
    }

    // 2. Find the subscription linked to that restaurant
    //    .populate('plan') replaces the plan ObjectId with the full Plan document
    let subscription = account.subscription;
    await reconcileSubscription(subscription);
    subscription = await Subscription.findById(subscription?._id)
      .select('-providerPlanId -providerSubId -pendingProviderSubId')
      .populate('plan', '-razorpayPlanId')
      .populate('pendingPlan', '-razorpayPlanId')
      .populate('scheduledPlan', '-razorpayPlanId');

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
      pendingPlan: subscription.pendingPlan || null,
      scheduledPlan: subscription.scheduledPlan || null,
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

    const account = await getBillingAccount(req);
    if (account.forbidden) return res.status(403).json({ success: false, message: 'Only an organization owner can manage billing.' });
    const restaurant = account.restaurant;
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

    const subscription = account.subscription;
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found. Contact support.' });
    }
    if (subscription.status === 'active' && subscription.plan.equals(plan._id)) {
      return res.status(409).json({ success: false, message: 'This is already your active plan.' });
    }
    if (subscription.status === 'active' && subscription.provider === 'razorpay') {
      return res.status(409).json({
        success: false,
        message: 'Use plan switching for an active paid subscription; a second Checkout is not required.',
      });
    }
    if (
      subscription.pendingProviderSubId &&
      !subscription.pendingPlan?.equals(plan._id)
    ) {
      return res.status(409).json({
        success: false,
        message: 'Cancel your existing upcoming subscription before choosing another plan.',
      });
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
          organizationId: account.organization?._id?.toString() || '',
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
 * POST /billing/subscription/change-plan
 *
 * Schedules an active Razorpay subscription to move to another paid plan at
 * the next billing boundary. Access and price remain unchanged until then.
 */
router.post('/subscription/change-plan', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ success: false, message: 'Restaurant access required.' });
    }
    if (!mongoose.isValidObjectId(req.body.planId)) {
      return res.status(400).json({ success: false, message: 'A valid target plan is required.' });
    }

    const [account, targetPlan] = await Promise.all([getBillingAccount(req), Plan.findById(req.body.planId)]);
    if (account.forbidden) return res.status(403).json({ success: false, message: 'Only an organization owner can manage billing.' });
    const restaurant = account.restaurant;
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this account.' });
    }
    if (!targetPlan || !targetPlan.isActive || targetPlan.price <= 0 || !targetPlan.razorpayPlanId) {
      return res.status(400).json({ success: false, message: 'Choose an available paid plan.' });
    }

    const subscription = account.subscription;
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found. Contact support.' });
    }
    if (subscription.status !== 'active' || subscription.provider !== 'razorpay' || !subscription.providerSubId) {
      return res.status(409).json({ success: false, message: 'Only an active paid subscription can switch plans.' });
    }
    if (subscription.plan.equals(targetPlan._id)) {
      return res.status(409).json({ success: false, message: 'This is already your active plan.' });
    }
    if (subscription.cancelAtPeriodEnd) {
      return res.status(409).json({ success: false, message: 'Remove the scheduled cancellation before changing plans.' });
    }
    if (subscription.scheduledPlan) {
      return res.status(409).json({ success: false, message: 'A plan change is already scheduled. Cancel it first.' });
    }

    const providerSubscription = await getRazorpayClient().subscriptions.update(
      subscription.providerSubId,
      {
        plan_id: targetPlan.razorpayPlanId,
        quantity: 1,
        schedule_change_at: 'cycle_end',
        customer_notify: true,
      }
    );

    subscription.scheduledPlan = targetPlan._id;
    subscription.scheduledPlanChangeAt = providerSubscription.change_scheduled_at
      ? new Date(providerSubscription.change_scheduled_at * 1000)
      : subscription.currentPeriodEnd;
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: `${targetPlan.displayName} is scheduled for your next billing cycle.`,
      changeAt: subscription.scheduledPlanChangeAt,
    });
  } catch (err) {
    console.error('[POST /billing/subscription/change-plan] Error:', err.message);
    return res.status(502).json({ success: false, message: 'Razorpay could not schedule the plan change.' });
  }
});

router.post('/subscription/change-plan/cancel', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ success: false, message: 'Restaurant access required.' });
    }
    const account = await getBillingAccount(req);
    if (account.forbidden) return res.status(403).json({ success: false, message: 'Only an organization owner can manage billing.' });
    const subscription = account.subscription;
    if (!subscription?.scheduledPlan || !subscription.providerSubId) {
      return res.status(409).json({ success: false, message: 'There is no scheduled plan change to cancel.' });
    }

    await getRazorpayClient().subscriptions.cancelScheduledChanges(subscription.providerSubId);
    subscription.scheduledPlan = null;
    subscription.scheduledPlanChangeAt = null;
    await subscription.save();
    return res.status(200).json({ success: true, message: 'Scheduled plan change cancelled.' });
  } catch (err) {
    console.error('[POST /billing/subscription/change-plan/cancel] Error:', err.message);
    return res.status(502).json({ success: false, message: 'Razorpay could not cancel the scheduled change.' });
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

    const account = await getBillingAccount(req);
    if (account.forbidden) return res.status(403).json({ success: false, message: 'Only an organization owner can manage billing.' });
    const restaurant = account.restaurant;
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this account.' });
    }

    const subscription = account.subscription;
    if (!subscription || subscription.pendingProviderSubId !== providerSubscriptionId) {
      return res.status(403).json({ success: false, message: 'This Checkout does not belong to your organization.' });
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

/**
 * POST /billing/subscription/cancel
 *
 * Cancels an upcoming subscription immediately, or schedules an active paid
 * subscription to end after its current paid period. Provider identifiers are
 * always resolved from the authenticated restaurant's own record.
 */
router.post('/subscription/cancel', jwtAuthMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ success: false, message: 'Restaurant access required.' });
    }

    const account = await getBillingAccount(req);
    if (account.forbidden) return res.status(403).json({ success: false, message: 'Only an organization owner can manage billing.' });
    const restaurant = account.restaurant;
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this account.' });
    }

    const subscription = account.subscription;
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found. Contact support.' });
    }

    if (subscription.pendingProviderSubId) {
      await getRazorpayClient().subscriptions.cancel(subscription.pendingProviderSubId, false);
      subscription.pendingPlan = null;
      subscription.pendingProviderSubId = null;
      subscription.pendingProviderStatus = null;
      subscription.pendingCreatedAt = null;
      subscription.authenticatedAt = null;
      await subscription.save();

      return res.status(200).json({
        success: true,
        cancellationType: 'upcoming',
        message: 'Upcoming subscription cancelled. Your current trial or plan is unchanged.',
      });
    }

    if (subscription.cancelAtPeriodEnd) {
      return res.status(200).json({
        success: true,
        cancellationType: 'period_end',
        message: 'Your subscription is already scheduled to end after the current billing period.',
        accessEndsAt: subscription.currentPeriodEnd,
      });
    }

    if (subscription.scheduledPlan) {
      return res.status(409).json({
        success: false,
        message: 'Cancel the scheduled plan change before cancelling the subscription.',
      });
    }

    if (subscription.provider !== 'razorpay' || !subscription.providerSubId) {
      return res.status(409).json({ success: false, message: 'There is no paid subscription to cancel.' });
    }

    await getRazorpayClient().subscriptions.cancel(subscription.providerSubId, true);
    subscription.cancelAtPeriodEnd = true;
    subscription.cancellationRequestedAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      cancellationType: 'period_end',
      message: 'Cancellation scheduled. You will retain access until the current billing period ends.',
      accessEndsAt: subscription.currentPeriodEnd,
    });
  } catch (err) {
    console.error('[POST /billing/subscription/cancel] Error:', err.message);
    return res.status(502).json({ success: false, message: 'Razorpay could not cancel the subscription. Please try again.' });
  }
});

module.exports = router;
