/**
 * One-time migration for subscriptions created before Growth became the
 * default trial plan. Trial end dates are preserved.
 *
 * Run after seedPlans.js with: node scripts/migrateGrowthTrials.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

async function migrateGrowthTrials() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const trialPlan = await Plan.findOne({ isDefaultTrialPlan: true, isActive: true });
    if (!trialPlan) {
      throw new Error('Default trial plan not found. Run npm run seed:plans first.');
    }

    const result = await Subscription.updateMany(
      { status: 'trial', provider: 'none', plan: { $ne: trialPlan._id } },
      { $set: { plan: trialPlan._id } }
    );

    console.log(`Moved ${result.modifiedCount} existing trial subscription(s) to ${trialPlan.displayName}.`);
  } catch (err) {
    console.error('Trial migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

migrateGrowthTrials();
