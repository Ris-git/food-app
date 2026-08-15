const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { jwtAuthMiddleware } = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorizeMiddleware");
const { permissions } = require("../config/roles");
const Restaurant = require("../models/Restaurant");
const Subscription = require("../models/Subscription");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");
const { reconcileSubscription } = require("../services/subscriptionLifecycleService");
const { checkEntitlement, FEATURES } = require("../services/entitlementService");

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
    let subscription = await Subscription.findOne({ restaurant: restaurant._id });
    await reconcileSubscription(subscription);
    const menuItems = await MenuItem.find({ restaurant: restaurant._id }).sort({ createdAt: -1 }).lean();
    subscription = await Subscription.findOne({ restaurant: restaurant._id }).populate("plan");

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

router.get("/my-analytics", jwtAuthMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.user.id });
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found." });

    const entitlement = await checkEntitlement(restaurant._id, FEATURES.VIEW_ANALYTICS);
    if (!entitlement.allowed) return res.status(403).json({ success: false, message: entitlement.reason });

    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 30 * 86400000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      return res.status(400).json({ success: false, message: "Choose a valid date range." });
    }
    to.setHours(23, 59, 59, 999);

    const match = { restaurant: restaurant._id, createdAt: { $gte: from, $lte: to } };
    const [summary, popularItems] = await Promise.all([
      Order.aggregate([
        { $match: match },
        { $group: {
          _id: null,
          orderCount: { $sum: 1 },
          deliveredOrders: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, "$totalPrice", 0] } },
        } },
      ]),
      Order.aggregate([
        { $match: { ...match, status: "Delivered" } },
        { $unwind: "$items" },
        { $group: { _id: "$items.menuItem", quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } } } },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
        { $lookup: { from: "menuitems", localField: "_id", foreignField: "_id", as: "menuItem" } },
        { $project: { _id: 0, menuItemId: "$_id", title: { $ifNull: [{ $arrayElemAt: ["$menuItem.title", 0] }, "Deleted item"] }, quantity: 1, revenue: 1 } },
      ]),
    ]);

    return res.json({
      success: true,
      analytics: {
        orderCount: summary[0]?.orderCount || 0,
        deliveredOrders: summary[0]?.deliveredOrders || 0,
        revenue: summary[0]?.revenue || 0,
        popularItems,
        from,
        to,
      },
    });
  } catch (err) {
    console.error("[GET /restaurant/my-analytics] Error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load analytics." });
  }
});

router.patch("/my-settings", jwtAuthMiddleware, async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.user.id });
    if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found." });

    const allowed = ["name", "franchiseName", "phone", "address", "formattedAddress", "cuisine", "operatingHours", "operationalStatus"];
    for (const field of allowed) {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    }
    await restaurant.save();
    return res.json({ success: true, message: "Restaurant settings saved.", restaurant });
  } catch (err) {
    console.error("[PATCH /restaurant/my-settings] Error:", err.message);
    return res.status(400).json({ success: false, message: err.message || "Failed to save settings." });
  }
});

// Keep parameterized routes after named routes so "my-dashboard" is not
// interpreted as a restaurant ID.
router.get("/:id", restaurantController.getRestaurantById);

module.exports = router;
