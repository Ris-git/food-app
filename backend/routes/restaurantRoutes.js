const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { jwtAuthMiddleware } = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorizeMiddleware");
const { permissions } = require("../config/roles");

// Public Routes
router.get("/", restaurantController.getAllRestaurants);
router.get("/:id", restaurantController.getRestaurantById);

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

module.exports = router;