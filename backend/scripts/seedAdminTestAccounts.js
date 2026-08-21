require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const accounts = [
  {
    name: 'Super Admin',
    username: 'superadmin',
    email: 'superadmin@foody.com',
    phone: '9999999999',
    role: 'superAdmin',
    password: 'FoodyAdmin!2026#Super',
  },
  {
    name: 'Admin Test User',
    username: 'admin',
    email: 'admin@foody.com',
    phone: '9999999998',
    role: 'admin',
    password: 'FoodyAdmin!2026#Standard',
  },
];

async function upsertAccount(account) {
  let user = await User.findOne({ username: account.username });
  if (!user) user = new User(account);
  else Object.assign(user, account);

  user.emailVerified = true;
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  user.verificationOTP = null;
  user.verificationOTPExpires = null;
  await user.save();

  const passwordMatches = await user.comparePassword(account.password);
  if (!passwordMatches || user.role !== account.role) {
    throw new Error(`Verification failed for ${account.username}.`);
  }
  console.log(`Restored ${account.role}: ${account.username}`);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/FoodDB');
  for (const account of accounts) await upsertAccount(account);
}

run()
  .catch((error) => {
    console.error('Admin account seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
