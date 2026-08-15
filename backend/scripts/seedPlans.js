/**
 * seedPlans.js — One-time script to populate the Plan collection.
 *
 * Run with:  node scripts/seedPlans.js
 *
 * Safe to run multiple times — uses upsert so existing plans are updated,
 * not duplicated.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Plan = require('../models/Plan');



const PLANS = [
  {
    name: 'free',
    displayName: 'Free',
    price: 0,              // ₹0
    currency: 'INR',
    billingInterval: 'none',
    trialDays: 30,         // 30-day full-feature trial for new restaurants
    razorpayPlanId: null,  // No Razorpay plan for Free tier
    isActive: true,
    limits: {
      staffAccounts: 0,
      menuItems: 20,
      analyticsAccess: false,
    },
  },
  {
    name: 'growth',
    displayName: 'Growth',
    price: 99900,          // ₹999 in paise
    currency: 'INR',
    billingInterval: 'monthly',
    trialDays: 0,
    razorpayPlanId: null,  // Will be filled in Milestone 6 after Razorpay setup
    isActive: true,
    limits: {
      staffAccounts: 3,
      menuItems: -1,        // -1 = unlimited
      analyticsAccess: true,
    },
  },
  {
    name: 'pro',
    displayName: 'Pro',
    price: 249900,         // ₹2499 in paise
    currency: 'INR',
    billingInterval: 'monthly',
    trialDays: 0,
    razorpayPlanId: null,  // Will be filled in Milestone 6 after Razorpay setup
    isActive: true,
    limits: {
      staffAccounts: -1,   // -1 = unlimited
      menuItems: -1,        // -1 = unlimited
      analyticsAccess: true,
    },
  },
];

async function seedPlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    for (const planData of PLANS) {
      // upsert: insert if not found, update if already exists
      const result = await Plan.findOneAndUpdate(
        { name: planData.name },    // filter by unique name
        { $set: planData },         // set all fields
        { upsert: true, returnDocument: 'after' }

      );
      console.log(`📦 Plan upserted: ${result.displayName} (₹${result.price / 100})`);
    }

    console.log('\n🎉 Seed complete! Plans in database:');
    const allPlans = await Plan.find({}).select('name displayName price limits');
    allPlans.forEach(p => {
      console.log(`   - ${p.displayName}: ₹${p.price / 100}/mo | staff: ${p.limits.staffAccounts} | menu: ${p.limits.menuItems}`);
    });

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedPlans();
