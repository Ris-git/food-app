/**
 * Synchronizes active paid Foody plans to Razorpay Test Mode.
 *
 * Safe to rerun:
 *  - linked plans are validated and skipped;
 *  - unlinked plans recover matching Razorpay plans through stable notes;
 *  - only genuinely missing provider plans are created.
 *
 * Run with: npm run sync:razorpay-plans
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Plan = require('../models/Plan');
const { getRazorpayClient } = require('../services/payments/razorpayClient');

const FOODY_PLAN_NOTE = 'foody_plan_id';
const INTERVALS = {
  monthly: { period: 'monthly', interval: 1 },
  yearly: { period: 'yearly', interval: 1 },
};

function formatProviderError(err) {
  return (
    err?.error?.description ||
    err?.error?.reason ||
    err?.description ||
    err?.message ||
    (err?.statusCode ? `Razorpay request failed with status ${err.statusCode}` : 'Unknown Razorpay error')
  );
}

function validateFoodyPlan(plan) {
  if (!Number.isInteger(plan.price) || plan.price <= 0) {
    throw new Error('price must be a positive integer in paise');
  }
  if (!plan.currency || typeof plan.currency !== 'string') {
    throw new Error('currency is required');
  }
  if (!INTERVALS[plan.billingInterval]) {
    throw new Error(`unsupported billing interval "${plan.billingInterval}"`);
  }
}

function providerPlanMatchesFoodyPlan(providerPlan, foodyPlan) {
  const expectedInterval = INTERVALS[foodyPlan.billingInterval];
  return (
    Number(providerPlan.item?.amount) === foodyPlan.price &&
    providerPlan.item?.currency === foodyPlan.currency &&
    providerPlan.period === expectedInterval.period &&
    Number(providerPlan.interval) === expectedInterval.interval
  );
}

async function fetchAllRazorpayPlans(client) {
  const pageSize = 100;
  const plans = [];

  for (let skip = 0; ; skip += pageSize) {
    const page = await client.plans.all({ count: pageSize, skip });
    const items = page.items || [];
    plans.push(...items);
    if (items.length < pageSize) break;
  }

  return plans;
}

async function synchronizePlan(client, foodyPlan, providerPlans) {
  validateFoodyPlan(foodyPlan);

  if (foodyPlan.razorpayPlanId) {
    const linkedPlan = await client.plans.fetch(foodyPlan.razorpayPlanId);
    if (!providerPlanMatchesFoodyPlan(linkedPlan, foodyPlan)) {
      throw new Error('linked Razorpay plan no longer matches Foody price, currency, or interval');
    }
    return { action: 'skipped', providerPlanId: linkedPlan.id };
  }

  const foodyPlanId = String(foodyPlan._id);
  const recoverablePlan = providerPlans.find(
    (providerPlan) => String(providerPlan.notes?.[FOODY_PLAN_NOTE] || '') === foodyPlanId
  );

  if (recoverablePlan) {
    if (!providerPlanMatchesFoodyPlan(recoverablePlan, foodyPlan)) {
      throw new Error('an existing Razorpay plan has this Foody ID but different billing terms');
    }
    foodyPlan.razorpayPlanId = recoverablePlan.id;
    await foodyPlan.save();
    return { action: 'recovered', providerPlanId: recoverablePlan.id };
  }

  const billing = INTERVALS[foodyPlan.billingInterval];
  const createdPlan = await client.plans.create({
    period: billing.period,
    interval: billing.interval,
    item: {
      name: `Foody ${foodyPlan.displayName}`,
      amount: foodyPlan.price,
      currency: foodyPlan.currency,
      description: `${foodyPlan.displayName} subscription plan for Foody`,
    },
    notes: {
      [FOODY_PLAN_NOTE]: foodyPlanId,
      foody_plan_name: foodyPlan.name,
      foody_environment: 'test',
    },
  });

  foodyPlan.razorpayPlanId = createdPlan.id;
  await foodyPlan.save();
  providerPlans.push(createdPlan);

  return { action: 'created', providerPlanId: createdPlan.id };
}

async function syncRazorpayPlans() {
  let databaseConnected = false;

  try {
    // Validate Test Mode credentials before opening the database or writing data.
    const client = getRazorpayClient();

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is required');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    databaseConnected = true;

    const foodyPlans = await Plan.find({
      isActive: true,
      price: { $gt: 0 },
      billingInterval: { $ne: 'none' },
    }).sort({ price: 1 });

    if (foodyPlans.length === 0) {
      console.log('No active paid Foody plans require synchronization.');
      return;
    }

    const providerPlans = await fetchAllRazorpayPlans(client);
    const summary = { created: 0, recovered: 0, skipped: 0, failed: 0 };

    for (const foodyPlan of foodyPlans) {
      try {
        const result = await synchronizePlan(client, foodyPlan, providerPlans);
        summary[result.action] += 1;
        console.log(`${foodyPlan.displayName}: ${result.action} (${result.providerPlanId})`);
      } catch (err) {
        summary.failed += 1;
        console.error(`${foodyPlan.displayName}: failed - ${formatProviderError(err)}`);
      }
    }

    console.log(
      `Sync complete. Created: ${summary.created}, recovered: ${summary.recovered}, skipped: ${summary.skipped}, failed: ${summary.failed}.`
    );

    if (summary.failed > 0) process.exitCode = 1;
  } catch (err) {
    console.error(`Razorpay plan sync stopped: ${formatProviderError(err)}`);
    process.exitCode = 1;
  } finally {
    if (databaseConnected) await mongoose.disconnect();
  }
}

syncRazorpayPlans();
