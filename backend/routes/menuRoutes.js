const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { jwtAuthMiddleware } = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/authorizeMiddleware");
const { permissions } = require("../config/roles");

// Public Route: Fetch menu for a specific store
router.get("/restaurant/:restaurantId", menuController.getMenuByRestaurant);

// Protected Routes: Add, update, delete menu item
router.post(
  "/",
  jwtAuthMiddleware,
  authorize([permissions.CREATE_MENU, permissions.MANAGE_MENU, permissions.ADMIN_ALL]),
  menuController.addMenuItem
);

router.post(
  "/import",
  jwtAuthMiddleware,
  authorize([permissions.CREATE_MENU, permissions.MANAGE_MENU, permissions.ADMIN_ALL]),
  menuController.importMenuItems
);

router.put(
  "/:id",
  jwtAuthMiddleware,
  authorize([permissions.EDIT_MENU, permissions.MANAGE_MENU, permissions.ADMIN_ALL]),
  menuController.updateMenuItem
);

router.delete(
  "/:id",
  jwtAuthMiddleware,
  authorize([permissions.DELETE_MENU, permissions.MANAGE_MENU, permissions.ADMIN_ALL]),
  menuController.deleteMenuItem
);

module.exports = router;
