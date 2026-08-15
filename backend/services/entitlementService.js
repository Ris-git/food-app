const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

/**
 * entitlementService.js
 *
 * The single source of truth for feature access decisions in Foody.
 *
 * Usage:
 *   const { checkEntitlement } = require('../services/entitlementService');
 *   const { allowed, reason } = await checkEntitlement(restaurantId, 'add_menu_item', { currentCount: 18 });
 *
 * Rules:
 *  - NEVER scatter plan checks (if plan === 'growth') across routes.
 *  - Always call checkEntitlement() for any feature that has a plan limit.
 *  - Pass the current resource count via context so resource collections do
 *    not need to be queried again inside this service.
 */

// ─── Supported Features ────────────────────────────────────────────────────
// Add new features here as the product grows. No other file needs to change.
const FEATURES = {
  ADD_MENU_ITEM:   'add_menu_item',
  ADD_STAFF:       'add_staff',
  VIEW_ANALYTICS:  'view_analytics',
};

// ─── Feature Evaluators ────────────────────────────────────────────────────
/**
 * Each evaluator receives the plan limits object and any context data.
 * Returns { allowed: boolean, reason: string }.
 */
const featureEvaluators = {
  [FEATURES.ADD_MENU_ITEM]: (limits, context = {}) => {
    const { currentCount = 0 } = context;

    // -1 means unlimited
    if (limits.menuItems === -1) {
      return { allowed: true, reason: 'Unlimited menu items on this plan.' };
    }

    if (currentCount < limits.menuItems) {
      return {
        allowed: true,
        reason: `Menu item ${currentCount + 1} of ${limits.menuItems} allowed.`,
      };
    }

    return {
      allowed: false,
      reason: `You've reached your ${limits.menuItems} menu item limit. Upgrade your plan to add more.`,
    };
  },

  [FEATURES.ADD_STAFF]: (limits, context = {}) => {
    const { currentCount = 0 } = context;

    if (limits.staffAccounts === -1) {
      return { allowed: true, reason: 'Unlimited staff accounts on this plan.' };
    }

    if (limits.staffAccounts === 0) {
      return {
        allowed: false,
        reason: 'Staff accounts are not available on the Free plan. Upgrade to Growth or Pro.',
      };
    }

    if (currentCount < limits.staffAccounts) {
      return {
        allowed: true,
        reason: `Staff account ${currentCount + 1} of ${limits.staffAccounts} allowed.`,
      };
    }

    return {
      allowed: false,
      reason: `You've reached your ${limits.staffAccounts} staff account limit. Upgrade to add more.`,
    };
  },

  [FEATURES.VIEW_ANALYTICS]: (limits) => {
    if (limits.analyticsAccess) {
      return { allowed: true, reason: 'Analytics access included in your plan.' };
    }

    return {
      allowed: false,
      reason: 'Analytics is not available on the Free plan. Upgrade to Growth or Pro.',
    };
  },
};

// ─── Main Export ───────────────────────────────────────────────────────────
/**
 * checkEntitlement
 *
 * @param {string|ObjectId} restaurantId  - The restaurant's MongoDB _id
 * @param {string}          feature       - Feature key from FEATURES constant
 * @param {object}          context       - Optional data (e.g. { currentCount: 5 })
 *
 * @returns {Promise<{ allowed: boolean, reason: string, planName: string, status: string }>}
 */
async function checkEntitlement(restaurantId, feature, context = {}) {
  // 1. Fetch the restaurant's subscription with plan limits populated
  const subscription = await Subscription.findOne({ restaurant: restaurantId })
    .populate('plan')
    .lean(); // .lean() returns a plain JS object — faster, no Mongoose overhead

  // 2. Guard: no subscription found (should never happen after M2, but be safe)
  if (!subscription || !subscription.plan) {
    return {
      allowed: false,
      reason: 'No active subscription found for this restaurant.',
      planName: 'unknown',
      status: 'unknown',
    };
  }

  const { status, plan } = subscription;
  let effectivePlan = plan;

  // A scheduled job will persist this transition in Milestone 10. Until then,
  // enforce Free limits immediately so an expired trial cannot retain access.
  const trialExpired =
    status === 'trial' &&
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt).getTime() <= Date.now();

  if (trialExpired) {
    const freePlan = await Plan.findOne({ isDefaultFreePlan: true, isActive: true }).lean();
    if (!freePlan) {
      return {
        allowed: false,
        reason: 'The trial has expired and the Free plan is not configured.',
        planName: plan.displayName,
        status,
      };
    }
    effectivePlan = freePlan;
  }

  const planName = effectivePlan.displayName;

  // 4. Find the evaluator for the requested feature
  const evaluate = featureEvaluators[feature];
  if (!evaluate) {
    // Unknown feature — fail open with a warning (don't silently block)
    console.warn(`[Entitlement] Unknown feature requested: "${feature}"`);
    return {
      allowed: true,
      reason: `Feature "${feature}" has no entitlement rule defined.`,
      planName,
      status,
    };
  }

  // 5. Evaluate the feature against the plan's limits
  const result = evaluate(effectivePlan.limits, context);

  if (trialExpired) {
    result.reason += ' Your trial has expired, so Free plan limits apply.';
  }

  // 6. If subscription is not active, limits are already constrained
  //    because the subscription.plan will be the 'free' plan at this point.
  //    But add a clarifying note if status is 'past_due' (still has access).
  if (status === 'past_due' && result.allowed) {
    result.reason += ' (Note: your payment is overdue — please update your billing details.)';
  }

  return {
    ...result,
    planName,
    status,
  };
}

module.exports = {
  checkEntitlement,
  FEATURES,
};
