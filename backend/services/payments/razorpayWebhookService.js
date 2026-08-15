const Plan = require('../../models/Plan');
const Subscription = require('../../models/Subscription');

const SUPPORTED_EVENTS = new Set([
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
]);

const fromUnix = (value) => (value ? new Date(value * 1000) : null);

async function getMatchingPlan(subscription, entity, usesPendingSubscription) {
  if (!entity.plan_id) throw new Error('Webhook subscription has no plan ID.');

  if (usesPendingSubscription) {
    const pendingPlan = await Plan.findById(subscription.pendingPlan);
    if (!pendingPlan || pendingPlan.razorpayPlanId !== entity.plan_id) {
      throw new Error('Webhook plan does not match the pending Foody plan.');
    }
    return pendingPlan;
  }

  if (subscription.providerPlanId !== entity.plan_id) {
    throw new Error('Webhook plan does not match the active Foody plan.');
  }
  return null;
}

async function processSubscriptionWebhook(event) {
  if (!SUPPORTED_EVENTS.has(event.event)) {
    return { outcome: 'ignored', reason: 'Unsupported subscription event.' };
  }

  const entity = event.payload?.subscription?.entity;
  if (!entity?.id) throw new Error('Webhook has no subscription entity.');

  const subscription = await Subscription.findOne({
    $or: [{ providerSubId: entity.id }, { pendingProviderSubId: entity.id }],
  });
  if (!subscription) {
    return { outcome: 'ignored', reason: 'No matching Foody subscription.' };
  }

  const providerEventAt = fromUnix(event.created_at) || new Date();
  const isChargeEvent = event.event === 'subscription.charged';
  const isOlderEvent = subscription.lastProviderEventAt && providerEventAt < subscription.lastProviderEventAt;
  if (isOlderEvent && !isChargeEvent) {
    return { outcome: 'ignored', reason: 'Older than the last processed provider event.' };
  }

  const usesPendingSubscription = subscription.pendingProviderSubId === entity.id;
  const pendingPlan = await getMatchingPlan(subscription, entity, usesPendingSubscription);
  const providerState = entity.status || event.event.replace('subscription.', '');

  // A late charge can contain useful period dates, but it must not resurrect a
  // subscription after a newer cancellation or failure event.
  if (isOlderEvent && isChargeEvent && !usesPendingSubscription) {
    const incomingStart = fromUnix(entity.current_start);
    const incomingEnd = fromUnix(entity.current_end);
    if (!subscription.currentPeriodStart && incomingStart) {
      subscription.currentPeriodStart = incomingStart;
    }
    if (incomingEnd && (!subscription.currentPeriodEnd || incomingEnd > subscription.currentPeriodEnd)) {
      subscription.currentPeriodEnd = incomingEnd;
    }
    await subscription.save();
    return { outcome: 'processed' };
  }

  if (event.event === 'subscription.authenticated') {
    if (usesPendingSubscription) {
      subscription.pendingProviderStatus = 'authenticated';
      subscription.authenticatedAt = providerEventAt;
    }
    subscription.lastProviderEventAt = providerEventAt;
    await subscription.save();
    return { outcome: 'processed' };
  }

  if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
    if (usesPendingSubscription) {
      subscription.plan = pendingPlan._id;
      subscription.provider = 'razorpay';
      subscription.providerPlanId = entity.plan_id;
      subscription.providerSubId = entity.id;
      subscription.pendingPlan = null;
      subscription.pendingProviderSubId = null;
      subscription.pendingProviderStatus = null;
      subscription.pendingCreatedAt = null;
      subscription.trialEndsAt = null;
    }

    subscription.status = 'active';
    subscription.providerStatus = providerState;
    subscription.currentPeriodStart = fromUnix(entity.current_start) || subscription.currentPeriodStart;
    subscription.currentPeriodEnd = fromUnix(entity.current_end) || subscription.currentPeriodEnd;
    if (!subscription.lastProviderEventAt || providerEventAt >= subscription.lastProviderEventAt) {
      subscription.lastProviderEventAt = providerEventAt;
    }
    await subscription.save();
    return { outcome: 'processed' };
  }

  if (usesPendingSubscription) {
    subscription.pendingProviderStatus = providerState;
  } else {
    subscription.providerStatus = providerState;
    if (event.event === 'subscription.pending' || event.event === 'subscription.halted') {
      subscription.status = 'past_due';
    }
    if (event.event === 'subscription.cancelled' || event.event === 'subscription.completed') {
      subscription.status = 'cancelled';
    }
  }

  subscription.currentPeriodStart = fromUnix(entity.current_start) || subscription.currentPeriodStart;
  subscription.currentPeriodEnd = fromUnix(entity.current_end) || subscription.currentPeriodEnd;
  subscription.lastProviderEventAt = providerEventAt;
  await subscription.save();
  return { outcome: 'processed' };
}

module.exports = { processSubscriptionWebhook };
