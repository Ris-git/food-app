const express = require('express');
const router = express.Router();
const RestaurantApplication = require('../models/RestaurantApplication');
const User = require('../models/User');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const { partnerValidationRules, validatePartner } = require('../middlewares/ValidatePartner');

// POST /partner/apply - Submit a new restaurant partner application
router.post('/apply', jwtAuthMiddleware, partnerValidationRules, validatePartner, async (req, res) => {

  try {
    const userId = req.user.id;

    // Defense-in-depth: Verify user email is verified before processing application
    const dbUser = await User.findById(userId);
    if (!dbUser || (!dbUser.emailVerified && !dbUser.isVerified && dbUser.role !== 'superAdmin')) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please check your inbox and verify your email address before applying to become a partner.',
      });
    }

    const { restaurantName, description, address, phone, cuisine } = req.body;

    if (!restaurantName || !address || !phone || !cuisine) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (restaurantName, address, phone, cuisine).',
      });
    }


    // Check for existing applications from this user
    const existingApplication = await RestaurantApplication.findOne({ user: userId });

    if (existingApplication) {
      if (existingApplication.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending application under review.',
          application: existingApplication,
        });
      }

      if (existingApplication.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'You are already an approved restaurant partner.',
          application: existingApplication,
        });
      }

      // If rejected, update and resubmit existing application
      if (existingApplication.status === 'rejected') {
        existingApplication.restaurantName = restaurantName;
        existingApplication.description = description || '';
        existingApplication.address = address;
        existingApplication.phone = phone;
        existingApplication.cuisine = cuisine;
        existingApplication.status = 'pending';
        existingApplication.adminRemarks = '';

        await existingApplication.save();

        return res.status(200).json({
          success: true,
          message: 'Your partner application has been updated and resubmitted for review.',
          application: existingApplication,
        });
      }
    }

    // Create a new application
    const newApplication = new RestaurantApplication({
      user: userId,
      restaurantName,
      description: description || '',
      address,
      phone,
      cuisine,
      status: 'pending',
    });

    await newApplication.save();

    return res.status(201).json({
      success: true,
      message: 'Restaurant application submitted successfully! It is now under admin review.',
      application: newApplication,
    });
  } catch (err) {
    console.error('Partner Apply Route Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error during application submission.',
      error: err.message,
    });
  }
});

// GET /partner/application - Fetch current user's partner application status
router.get('/application', jwtAuthMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const application = await RestaurantApplication.findOne({ user: userId });

    if (!application) {
      return res.status(200).json({
        success: true,
        hasApplication: false,
        application: null,
      });
    }

    return res.status(200).json({
      success: true,
      hasApplication: true,
      application,
    });
  } catch (err) {
    console.error('Fetch Partner Application Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error while fetching application.',
      error: err.message,
    });
  }
});

module.exports = router;
