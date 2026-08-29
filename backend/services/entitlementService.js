const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const Restaurant = require('../models/Restaurant');
 //The single source of truth for feature access decisions in Foody.



// Add new features here as the product grows. No other file needs to change.
const FEATURES = {
  ADD_MENU_ITEM:   'add_menu_item',
  ADD_STAFF:       'add_staff',
  VIEW_ANALYTICS:  'view_analytics',
  IMPORT_MENU:     'import_menu',
  CREATE_RESTAURANT: 'create_restaurant',
  INVITE_STAFF: 'invite_staff',
};


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
  [FEATURES.IMPORT_MENU]: (limits) => limits.menuImportAccess
    ? { allowed: true, reason: 'Menu import is included in this plan.' }
    : { allowed: false, reason: 'CSV/XLSX menu import requires Growth or Pro.' },
  [FEATURES.CREATE_RESTAURANT]: (limits, context = {}) => {
    const currentCount = context.currentCount || 0;
    if (limits.restaurantLocations === -1 || currentCount < limits.restaurantLocations) {
      return { allowed: true, reason: limits.restaurantLocations === -1 ? 'Unlimited restaurants.' : `Restaurant ${currentCount + 1} of ${limits.restaurantLocations} allowed.` };
    }
    return { allowed: false, reason: `You've reached your ${limits.restaurantLocations} restaurant limit.` };
  },
  [FEATURES.INVITE_STAFF]: (limits, context = {}) => {
    const currentCount = context.currentCount || 0;
    if (limits.staffAccounts === -1 || currentCount < limits.staffAccounts) {
      return { allowed: true, reason: limits.staffAccounts === -1 ? 'Unlimited staff accounts.' : `Staff account ${currentCount + 1} of ${limits.staffAccounts} allowed.` };
    }
    return { allowed: false, reason: `You've reached your ${limits.staffAccounts} staff account limit.` };
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
async function checkEntitlement(scopeId, feature, context = {}) {
  let organizationId = context.organizationId || null;
  let restaurantId = context.restaurantId || null;
  if (!organizationId && scopeId) {
    const restaurant = await Restaurant.findById(scopeId).select('organization').lean();
    if (restaurant) {
      restaurantId = restaurant._id;
      organizationId = restaurant.organization || null;
    } else {
      organizationId = scopeId;
    }
  }
  // 1. Fetch the restaurant's subscription with plan limits populated
  const subscription = await Subscription.findOne(
    organizationId ? { organization: organizationId } : { restaurant: restaurantId }
  )
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

  // Reconciliation persists this transition on reads and from the scheduler.
  // Keep this defensive fallback so access remains correct if that job is late.
  const trialExpired =
    status === 'trial' &&
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt).getTime() <= Date.now();

  // Failed or cancelled billing must not remove access that was already paid
  // for. Once that paid period ends, all feature checks consistently fall
  // back to Free without waiting for a scheduled database migration.
  const paidAccessExpired =
    ['past_due', 'cancelled'].includes(status) &&
    (!subscription.currentPeriodEnd ||
      new Date(subscription.currentPeriodEnd).getTime() <= Date.now());

  if (trialExpired || paidAccessExpired) {
    const freePlan = await Plan.findOne({ isDefaultFreePlan: true, isActive: true }).lean();
    if (!freePlan) {
      return {
        allowed: false,
        reason: 'Free fallback limits are not configured.',
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
    // Unknown feature keys are denied so typos cannot accidentally unlock paid access.
    console.warn(`[Entitlement] Unknown feature requested: "${feature}"`);
    return {
      allowed: false,
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
  if (paidAccessExpired) {
    result.reason += ' Your paid access period has ended, so Free plan limits apply.';
  }

  // 6. If subscription is not active, limits are already constrained
  //    because the subscription.plan will be the 'free' plan at this point.
  //    But add a clarifying note if status is 'past_due' (still has access).
  if (status === 'past_due' && !paidAccessExpired && result.allowed) {
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
