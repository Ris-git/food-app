require('dotenv').config();
const mongoose = require('mongoose');
const { reconcileExpiredSubscriptions } = require('../services/subscriptionLifecycleService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/FoodDB');
  const result = await reconcileExpiredSubscriptions();
  console.log(`Subscription reconciliation complete: ${result.reconciled}/${result.scanned} updated.`);
}

run()
  .catch((error) => {
    console.error('Subscription reconciliation failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
