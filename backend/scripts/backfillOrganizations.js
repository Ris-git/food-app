require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const OrganizationMembership = require('../models/OrganizationMembership');
const RestaurantMembership = require('../models/RestaurantMembership');
const StaffInvitation = require('../models/StaffInvitation');
const { ensureOwnerOrganization } = require('../services/organizationProvisioningService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/FoodDB');
  const restaurants = await Restaurant.find().sort({ createdAt: 1 });
  const stats = { organizationsCreated: 0, restaurantsMigrated: 0, membershipsCreated: 0, subscriptionsMigrated: 0, skipped: 0, warnings: [] };

  for (const restaurant of restaurants) {
    if (!restaurant.user) {
      stats.warnings.push(`Restaurant ${restaurant._id} has no legacy owner.`);
      continue;
    }
    const provisioned = await ensureOwnerOrganization({ userId: restaurant.user, suggestedName: restaurant.franchiseName || restaurant.name });
    if (provisioned.created) stats.organizationsCreated += 1;
    const organizationId = provisioned.organization._id;

    if (!restaurant.organization || !restaurant.organization.equals(organizationId)) {
      restaurant.organization = organizationId;
      await restaurant.save();
      stats.restaurantsMigrated += 1;
    } else stats.skipped += 1;

    const existed = await RestaurantMembership.exists({ restaurant: restaurant._id, user: restaurant.user });
    await RestaurantMembership.findOneAndUpdate(
      { restaurant: restaurant._id, user: restaurant.user },
      { $setOnInsert: { organization: organizationId, role: 'OWNER', status: 'ACTIVE' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    if (!existed) stats.membershipsCreated += 1;

    const subscription = await Subscription.findOne({ restaurant: restaurant._id });
    if (subscription && !subscription.organization) {
      const conflicting = await Subscription.findOne({ organization: organizationId });
      if (!conflicting) {
        subscription.organization = organizationId;
        await subscription.save();
        stats.subscriptionsMigrated += 1;
      } else if (!conflicting._id.equals(subscription._id)) {
        stats.warnings.push(`Organization ${organizationId} has multiple legacy subscriptions; kept ${conflicting._id} as the account subscription.`);
      }
    }
  }

  for (const organization of await Organization.find()) {
    const [restaurantCount, activeStaff, pendingInvites] = await Promise.all([
      Restaurant.countDocuments({ organization: organization._id, lifecycleStatus: 'ACTIVE' }),
      OrganizationMembership.countDocuments({ organization: organization._id, role: { $ne: 'OWNER' }, status: 'ACTIVE' }),
      StaffInvitation.countDocuments({ organization: organization._id, status: 'PENDING' }),
    ]);
    organization.usage = { restaurantCount, staffSeats: activeStaff + pendingInvites };
    await organization.save();
  }

  console.log(JSON.stringify(stats, null, 2));
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
