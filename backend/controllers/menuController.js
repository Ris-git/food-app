const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const Restaurant = require("../models/Restaurant");
const { checkEntitlement, FEATURES } = require("../services/entitlementService");
const { resolveRestaurantAccess, RESTAURANT_PERMISSIONS } = require("../services/organizationAccessService");

// Add a Menu Item to a specific Restaurant
exports.addMenuItem = async (req, res) => {
  try {
    const { title, type, description, price, restaurantId } = req.body;

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ success: false, message: "Valid restaurantId is required" });
    }

    // Check if the target restaurant exists
    const restaurant = req.restaurant?._id?.toString() === restaurantId
      ? req.restaurant
      : null;
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Target restaurant not found" });
    }

    // Authorization check: Verify ownership
    const currentCount = await MenuItem.countDocuments({ restaurant: restaurantId });
    const entitlement = await checkEntitlement(req.organization?._id || restaurantId, FEATURES.ADD_MENU_ITEM, { currentCount, organizationId: req.organization?._id, restaurantId });
    if (!entitlement.allowed) {
      return res.status(403).json({ success: false, message: entitlement.reason });
    }

    const newMenuItem = new MenuItem({
      title,
      type,
      description,
      price,
      restaurant: restaurantId
    });

    const savedItem = await newMenuItem.save();

    return res.status(201).json({
      success: true,
      message: "Menu item added successfully",
      menuItem: savedItem
    });
  } catch (err) {
    console.error("Add Menu Item Error: ", err);
    return res.status(500).json({ success: false, message: "Server error creating menu item" });
  }
};

// Import validated menu rows parsed from CSV/XLSX by the frontend.
exports.importMenuItems = async (req, res) => {
  try {
    const restaurant = req.restaurant;

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0 || items.length > 200) {
      return res.status(400).json({ success: false, message: "Import between 1 and 200 menu items at a time." });
    }

    const currentCount = await MenuItem.countDocuments({ restaurant: restaurant._id });
    const importEntitlement = await checkEntitlement(req.organization?._id || restaurant._id, FEATURES.IMPORT_MENU, { organizationId: req.organization?._id, restaurantId: restaurant._id });
    if (!importEntitlement.allowed) {
      return res.status(403).json({ success: false, message: importEntitlement.reason });
    }
    const entitlement = await checkEntitlement(req.organization?._id || restaurant._id, FEATURES.ADD_MENU_ITEM, {
      currentCount: currentCount + items.length - 1,
      organizationId: req.organization?._id,
      restaurantId: restaurant._id,
    });
    if (!entitlement.allowed) {
      return res.status(403).json({ success: false, message: entitlement.reason });
    }

    const allowedTypes = new Set(["veg", "non-veg", "beverage", "dessert", "other"]);
    const documents = items.map((item, index) => {
      const title = String(item.title || "").trim();
      const price = Number(item.price);
      const type = String(item.type || "other").toLowerCase();
      if (!title || !Number.isFinite(price) || price < 0) {
        throw new Error(`Row ${index + 1} requires a title and a non-negative price.`);
      }
      return {
        title,
        price,
        type: allowedTypes.has(type) ? type : "other",
        description: String(item.description || "").trim(),
        isAvailable: item.isAvailable !== false,
        restaurant: restaurant._id,
      };
    });

    const imported = await MenuItem.insertMany(documents);
    return res.status(201).json({ success: true, message: `${imported.length} menu items imported.`, menuItems: imported });
  } catch (err) {
    console.error("Import Menu Items Error: ", err);
    return res.status(400).json({ success: false, message: err.message || "Menu import failed" });
  }
};

// Get all menu items for a specific restaurant (Public)
exports.getMenuByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID format" });
    }

    const menuItems = await MenuItem.find({ restaurant: restaurantId });

    return res.status(200).json({
      success: true,
      count: menuItems.length,
      menuItems
    });
  } catch (err) {
    console.error("Get Menu Error: ", err);
    return res.status(500).json({ success: false, message: "Server error fetching menu items" });
  }
};

// Update a Menu Item (Owner / Admin)
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid menu item ID" });
    }

    const menuItem = await MenuItem.findById(id).populate("restaurant");
    if (!menuItem) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    const updateAccess = await resolveRestaurantAccess(req.user, { restaurantId: menuItem.restaurant?._id, permission: RESTAURANT_PERMISSIONS.MANAGE_MENU });
    if (!updateAccess) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this menu item" });
    }

    const updates = {};
    for (const field of ["title", "type", "description", "price", "isAvailable"]) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const updatedItem = await MenuItem.findByIdAndUpdate(id, { $set: updates }, { returnDocument: "after", runValidators: true });

    return res.status(200).json({ success: true, message: "Menu item updated successfully", menuItem: updatedItem });
  } catch (err) {
    console.error("Update Menu Item Error: ", err);
    return res.status(500).json({ success: false, message: "Server error updating menu item" });
  }
};

// Delete a Menu Item (Owner / Admin)
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid menu item ID" });
    }

    const menuItem = await MenuItem.findById(id).populate("restaurant");
    if (!menuItem) {
      return res.status(404).json({ success: false, message: "Menu item not found" });
    }

    const deleteAccess = await resolveRestaurantAccess(req.user, { restaurantId: menuItem.restaurant?._id, permission: RESTAURANT_PERMISSIONS.MANAGE_MENU });
    if (!deleteAccess) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this menu item" });
    }

    await menuItem.deleteOne();

    return res.status(200).json({ success: true, message: "Menu item deleted successfully" });
  } catch (err) {
    console.error("Delete Menu Item Error: ", err);
    return res.status(500).json({ success: false, message: "Server error deleting menu item" });
  }
};
