const express = require('express');
const router = express.Router();
const RestaurantApplication = require('../models/RestaurantApplication');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const RestaurantMembership = require('../models/RestaurantMembership');
const Organization = require('../models/Organization');
const { ensureOwnerOrganization } = require('../services/organizationProvisioningService');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');

// Helper role check for Admin / SuperAdmin
const verifyAdminAccess = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superAdmin')) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Admin privileges required.',
    });
  }
  next();
};

// GET /admin/applications - Get all partner applications for admin review
router.get('/applications', jwtAuthMiddleware, verifyAdminAccess, async (req, res) => {
  try {
    const applications = await RestaurantApplication.find()
      .populate('user', 'name email phone username role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (err) {
    console.error('Fetch Admin Applications Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching applications.',
      error: err.message,
    });
  }
});

// PATCH /admin/applications/:id/approve - Approve application, create Restaurant with V2 data, upgrade User.role, seed MenuItems
router.patch('/applications/:id/approve', jwtAuthMiddleware, verifyAdminAccess, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const application = await RestaurantApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve application. Current status is already '${application.status}'.`,
      });
    }

    const isAdditionalLocation = application.applicationType === 'ADDITIONAL_LOCATION';

    // Billing policy must exist before initial approval starts. Otherwise the
    // restaurant could be created without a usable subscription.
    const trialPlan = await Plan.findOne({
      isDefaultTrialPlan: true,
      isActive: true,
      trialDays: { $gt: 0 },
    });
    if (!trialPlan && !isAdditionalLocation) {
      return res.status(503).json({
        success: false,
        message: 'The default trial plan is not configured. Run the plan seed before approving applications.',
      });
    }

    const provisioned = isAdditionalLocation
      ? { organization: await Organization.findById(application.organization) }
      : await ensureOwnerOrganization({
          userId: application.user,
          suggestedName: application.franchiseName || application.restaurantName,
        });
    if (!provisioned.organization || provisioned.organization.status !== 'ACTIVE') {
      return res.status(409).json({ success: false, message: 'The target organization is not active.' });
    }

    // 1. Mark Application as Approved
    application.status = 'approved';
    application.adminRemarks = req.body.adminRemarks || 'Approved by Admin';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();

    // 2. Create Restaurant Record linked to user (V2 Enabled)
    const newRestaurant = new Restaurant({
      name: application.restaurantName,
      franchiseName: application.franchiseName || '',
      logoUrl: application.logoUrl || '',
      address: application.address || application.formattedAddress,
      formattedAddress: application.formattedAddress || application.address,
      location: application.location || { type: 'Point', coordinates: [77.6412, 12.9719] },
      phone: application.phone,
      cuisine: application.cuisine,
      operatingHours: application.operatingHours,
      mealSlots: application.mealSlots,
      user: application.user,
      organization: provisioned.organization._id,
      operationalStatus: 'OPEN',
    });
    await newRestaurant.save();
    await RestaurantMembership.findOneAndUpdate(
      { restaurant: newRestaurant._id, user: application.user },
      { $setOnInsert: { organization: provisioned.organization._id, role: 'OWNER', status: 'ACTIVE' } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    // Additional locations reserved their plan slot when submitted. Initial
    // applications increment usage only once the first restaurant is created.
    if (!isAdditionalLocation) {
      await Organization.updateOne({ _id: provisioned.organization._id }, { $inc: { 'usage.restaurantCount': 1 } });
    }

    // 3. Seed MenuItems if staged menu items exist
    let seededMenuItemsCount = 0;
    if (application.stagedMenuItems && application.stagedMenuItems.length > 0) {
      const menuDocs = application.stagedMenuItems.map((item) => ({
        title: item.name || 'Unnamed Item',
        type: item.isVeg ? 'veg' : 'non-veg',
        description: item.description || '',
        price: item.price || 0,
        restaurant: newRestaurant._id,
        isAvailable: true,
      }));
      const seeded = await MenuItem.insertMany(menuDocs);
      seededMenuItemsCount = seeded.length;
    }

    // 4. Upgrade User.role to 'restaurant'
    await User.findByIdAndUpdate(application.user, { role: 'restaurant' });

    // 5. Start the restaurant on the configured trial plan. The referenced
    // plan is the restaurant's real entitlement source throughout the trial.
    const existingSubscription = await Subscription.findOne({ organization: provisioned.organization._id });
    const trialEndsAt = existingSubscription?.trialEndsAt || (!isAdditionalLocation ? new Date(Date.now() + trialPlan.trialDays * 24 * 60 * 60 * 1000) : null);
    if (!existingSubscription && !isAdditionalLocation) {
      await Subscription.create({
        organization: provisioned.organization._id,
        restaurant: newRestaurant._id,
        plan: trialPlan._id,
        status: 'trial',
        provider: 'none',
        trialEndsAt,
      });
    }

    console.log(isAdditionalLocation
      ? `Additional location '${newRestaurant.name}' approved for organization ${provisioned.organization._id}.`
      : `Trial subscription created for '${newRestaurant.name}' — expires ${trialEndsAt.toDateString()}`);

    console.log(
      `✅ Application ${applicationId} approved. Created restaurant '${newRestaurant.name}', seeded ${seededMenuItemsCount} menu items, upgraded user to 'restaurant' role, and started 30-day trial.`
    );

    return res.status(200).json({
      success: true,
      message: isAdditionalLocation
        ? 'Location approved and added to the organization.'
        : 'Application approved! Restaurant created, menu items seeded, user upgraded, and trial started.',
      application,
      restaurant: newRestaurant,
      seededMenuItemsCount,
    });
  } catch (err) {
    console.error('Approve Application Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during application approval.',
      error: err.message,
    });
  }
});

// PATCH /admin/applications/:id/reject - Reject application with admin remarks
router.patch('/applications/:id/reject', jwtAuthMiddleware, verifyAdminAccess, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { adminRemarks } = req.body;

    const application = await RestaurantApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject application. Current status is already '${application.status}'.`,
      });
    }

    // Mark Application as Rejected with remarks
    application.status = 'rejected';
    application.adminRemarks = adminRemarks || 'Application did not meet restaurant criteria.';
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();
    if (application.applicationType === 'ADDITIONAL_LOCATION' && application.organization) {
      await Organization.updateOne(
        { _id: application.organization, 'usage.restaurantCount': { $gt: 0 } },
        { $inc: { 'usage.restaurantCount': -1 } }
      );
    }

    console.log(`❌ Application ${applicationId} rejected. Remarks: ${application.adminRemarks}`);

    return res.status(200).json({
      success: true,
      message: 'Application rejected.',
      application,
    });
  } catch (err) {
    console.error('Reject Application Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during application rejection.',
      error: err.message,
    });
  }
});

module.exports = router;
