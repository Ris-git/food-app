const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const Restaurant = require("../models/Restaurant");

// Add a Menu Item to a specific Restaurant
exports.addMenuItem = async (req, res) => {
  try {
    const { title, type, description, price, restaurantId } = req.body;

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ success: false, message: "Valid restaurantId is required" });
    }

    // Check if the target restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Target restaurant not found" });
    }

    // Authorization check: Verify ownership
    if (restaurant.user?.toString() !== req.user.id && !["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized to add items to this restaurant" });
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

    if (menuItem.restaurant?.user?.toString() !== req.user.id && !["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this menu item" });
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(id, { $set: req.body }, { new: true, runValidators: true });

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

    if (menuItem.restaurant?.user?.toString() !== req.user.id && !["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this menu item" });
    }

    await menuItem.deleteOne();

    return res.status(200).json({ success: true, message: "Menu item deleted successfully" });
  } catch (err) {
    console.error("Delete Menu Item Error: ", err);
    return res.status(500).json({ success: false, message: "Server error deleting menu item" });
  }
};