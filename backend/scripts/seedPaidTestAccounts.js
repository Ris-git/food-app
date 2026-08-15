require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');

const TEST_PASSWORD = 'FoodyQA!2026#GrowthPro';
const fixtures = [
  {
    planName: 'free',
    subscriptionStatus: 'free',
    username: 'foody_free_test',
    email: 'free.test@foody.local',
    name: 'Free Test Owner',
    restaurantName: 'Free Test Kitchen',
    phone: '9000000100',
  },
  {
    planName: 'growth',
    subscriptionStatus: 'active',
    username: 'foody_growth_test',
    email: 'growth.test@foody.local',
    name: 'Growth Test Owner',
    restaurantName: 'Growth Test Kitchen',
    phone: '9000000101',
  },
  {
    planName: 'pro',
    subscriptionStatus: 'active',
    username: 'foody_pro_test',
    email: 'pro.test@foody.local',
    name: 'Pro Test Owner',
    restaurantName: 'Pro Test Kitchen',
    phone: '9000000102',
  },
];

async function upsertFixture(fixture) {
  const plan = await Plan.findOne({ name: fixture.planName, isActive: true });
  if (!plan) throw new Error(`Active ${fixture.planName} plan not found. Run npm run seed:plans first.`);

  let user = await User.findOne({
    $or: [{ username: fixture.username }, { email: fixture.email }],
  });
  if (!user) {
    user = new User({
      name: fixture.name,
      email: fixture.email,
      username: fixture.username,
      password: TEST_PASSWORD,
      phone: fixture.phone,
      role: 'restaurant',
      emailVerified: true,
      isVerified: true,
    });
  } else {
    user.name = fixture.name;
    user.email = fixture.email;
    user.username = fixture.username;
    user.password = TEST_PASSWORD;
    user.phone = fixture.phone;
    user.role = 'restaurant';
    user.emailVerified = true;
    user.isVerified = true;
  }
  await user.save();

  let restaurant = await Restaurant.findOne({ user: user._id });
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: fixture.restaurantName,
      address: '101 QA Street, Bengaluru',
      formattedAddress: '101 QA Street, Bengaluru, Karnataka',
      phone: fixture.phone,
      cuisine: ['Indian', 'Test Kitchen'],
      user: user._id,
      operationalStatus: 'OPEN',
    });
  }

  await Subscription.findOneAndUpdate(
    { restaurant: restaurant._id },
    {
      plan: plan._id,
      status: fixture.subscriptionStatus,
      provider: 'none',
      providerPlanId: null,
      providerSubId: null,
      providerStatus: 'fixture',
      trialEndsAt: null,
      currentPeriodStart: fixture.subscriptionStatus === 'active' ? new Date() : null,
      currentPeriodEnd: fixture.subscriptionStatus === 'active' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      pendingPlan: null,
      pendingProviderSubId: null,
      pendingProviderStatus: null,
      scheduledPlan: null,
      scheduledPlanChangeAt: null,
      cancelledAt: null,
      cancelAtPeriodEnd: false,
      cancellationRequestedAt: null,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return fixture;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/FoodDB');
  for (const fixture of fixtures) {
    await upsertFixture(fixture);
    console.log(`Created ${fixture.planName.toUpperCase()} fixture: ${fixture.username}`);
  }
  console.log(`Shared password: ${TEST_PASSWORD}`);
}

run()
  .catch((error) => {
    console.error('Test account seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
