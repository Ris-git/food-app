const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

async function getFreePlan() {
  const freePlan = await Plan.findOne({ isDefaultFreePlan: true, isActive: true });
  if (!freePlan) throw new Error('The active default Free plan is not configured.');
  return freePlan;
}

async function reconcileSubscription(subscription, now = new Date()) {
  if (!subscription) return null;

  const trialExpired =
    subscription.status === 'trial' &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt.getTime() <= now.getTime();
  const cancelledAccessExpired =
    subscription.status === 'cancelled' &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() <= now.getTime());

  if (!trialExpired && !cancelledAccessExpired) return subscription;

  const freePlan = await getFreePlan();
  subscription.plan = freePlan._id;
  subscription.status = 'free';
  subscription.trialEndsAt = null;

  // Preserve an authenticated pending checkout after trial expiry: it is not
  // an entitlement, but a delayed activation webhook may still legitimately
  // promote it. Terminal paid subscriptions no longer need provider linkage.
  if (cancelledAccessExpired) {
    subscription.provider = 'none';
    subscription.providerPlanId = null;
    subscription.providerSubId = null;
    subscription.providerStatus = null;
    subscription.currentPeriodStart = null;
    subscription.currentPeriodEnd = null;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancellationRequestedAt = null;
    subscription.scheduledPlan = null;
    subscription.scheduledPlanChangeAt = null;
  }

  await subscription.save();
  return subscription;
}

async function reconcileExpiredSubscriptions(now = new Date()) {
  const candidates = await Subscription.find({
    $or: [
      { status: 'trial', trialEndsAt: { $lte: now } },
      {
        status: 'cancelled',
        $or: [{ currentPeriodEnd: { $lte: now } }, { currentPeriodEnd: null }],
      },
    ],
  });

  let reconciled = 0;
  for (const subscription of candidates) {
    await reconcileSubscription(subscription, now);
    reconciled += 1;
  }
  return { scanned: candidates.length, reconciled };
}

module.exports = { reconcileSubscription, reconcileExpiredSubscriptions };
