const express = require('express');
const router = express.Router();
const RestaurantApplication = require('../models/RestaurantApplication');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
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

    // 1. Mark Application as Approved
    application.status = 'approved';
    application.adminRemarks = req.body.adminRemarks || 'Approved by Admin';
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
      operationalStatus: 'OPEN',
    });
    await newRestaurant.save();

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

    // 5. Auto-create a 30-day trial Subscription for the new restaurant
    const freePlan = await Plan.findOne({ name: 'free' });
    if (freePlan) {
      const TRIAL_DAYS = freePlan.trialDays || 30;
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

      await Subscription.create({
        restaurant: newRestaurant._id,
        plan: freePlan._id,
        status: 'trial',
        provider: 'none',
        trialEndsAt,
      });

      console.log(`🎁 Trial subscription created for '${newRestaurant.name}' — expires ${trialEndsAt.toDateString()}`);
    } else {
      console.warn('⚠️  Free plan not found in DB. Run: node scripts/seedPlans.js');
    }

    console.log(
      `✅ Application ${applicationId} approved. Created restaurant '${newRestaurant.name}', seeded ${seededMenuItemsCount} menu items, upgraded user to 'restaurant' role, and started 30-day trial.`
    );

    return res.status(200).json({
      success: true,
      message: 'Application approved! Restaurant created, menu items seeded, user upgraded, and 30-day trial started.',
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
    await application.save();

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
