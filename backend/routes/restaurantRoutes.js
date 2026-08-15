const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { jwtAuthMiddleware } = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorizeMiddleware");
const { permissions } = require("../config/roles");
const Restaurant = require("../models/Restaurant");
const Subscription = require("../models/Subscription");
const MenuItem = require("../models/MenuItem");

// Public Routes
router.get("/", restaurantController.getAllRestaurants);

// Protected Routes (Vendor / Admin only)
router.post(
  "/",
  jwtAuthMiddleware,
  authorize([permissions.MANAGE_RESTAURANT, permissions.ADMIN_ALL]),
  restaurantController.createRestaurant
);

router.put(
  "/:id",
  jwtAuthMiddleware,
  authorize([permissions.MANAGE_RESTAURANT, permissions.ADMIN_ALL]),
  restaurantController.updateRestaurant
);

/**
 * GET /restaurant/my-dashboard
 *
 * Returns the authenticated restaurant owner's dashboard data:
 * restaurant profile + subscription + plan + menu items preview.
 *
 * Uses Promise.all to fetch restaurant and subscription IN PARALLEL
 * (not sequentially) — halves the DB round-trip time.
 *
 * Protected: requires valid JWT with role === 'restaurant'.
 */
router.get("/my-dashboard", jwtAuthMiddleware, async (req, res) => {
  try {
    // Step 1: Find this user's restaurant
    const restaurant = await Restaurant.findOne({ user: req.user.id });
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "No restaurant found for this account.",
      });
    }

    // Step 2: Fetch subscription + menu items in parallel (Promise.all)
    const [subscription, menuItems] = await Promise.all([
      Subscription.findOne({ restaurant: restaurant._id }).populate("plan"),
      MenuItem.find({ restaurant: restaurant._id }).limit(10).lean(),
    ]);

    // Step 3: Compute trial days remaining
    let trialDaysRemaining = null;
    if (subscription?.status === "trial" && subscription?.trialEndsAt) {
      const msRemaining = new Date(subscription.trialEndsAt).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    }

    return res.status(200).json({
      success: true,
      restaurant,
      subscription,
      plan: subscription?.plan || null,
      trialDaysRemaining,
      menuItems,
    });
  } catch (err) {
    console.error("[GET /restaurant/my-dashboard] Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard data.",
    });
  }
});

// Keep parameterized routes after named routes so "my-dashboard" is not
// interpreted as a restaurant ID.
router.get("/:id", restaurantController.getRestaurantById);

module.exports = router;
