const express = require('express');
const router = express.Router();
const RestaurantApplication = require('../models/RestaurantApplication');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');
const { permissions } = require('../config/roles');

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

// PATCH /admin/applications/:id/approve - Approve application, create Restaurant, upgrade User.role to 'restaurant'
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

    // 2. Create Restaurant Record linked to user
    const newRestaurant = new Restaurant({
      name: application.restaurantName,
      address: application.address,
      user: application.user,
      operationalStatus: 'OPEN',
    });
    await newRestaurant.save();

    // 3. Upgrade User.role to 'restaurant'
    await User.findByIdAndUpdate(application.user, { role: 'restaurant' });

    console.log(`✅ Application ${applicationId} approved. Created restaurant '${newRestaurant.name}' and upgraded user to 'restaurant' role.`);

    return res.status(200).json({
      success: true,
      message: 'Application approved successfully! Restaurant created and user role upgraded.',
      application,
      restaurant: newRestaurant,
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
