const mongoose = require("mongoose");
const Restaurant = require("../models/Restaurant");

// Create a new Restaurant (Vendor/Admin)
exports.createRestaurant = async (req, res) => {
  try {
    const { name, address, operationalStatus } = req.body;

    if (!name || !address) {
      return res.status(400).json({ success: false, message: "Restaurant name and address are required" });
    }

    // A user can own a restaurant—we grab user ID directly from JWT (req.user.id)
    const newRestaurant = new Restaurant({
      name,
      address,
      operationalStatus,
      user: req.user.id
    });

    const savedRestaurant = await newRestaurant.save();

    return res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      restaurant: savedRestaurant
    });
  } catch (err) {
    console.error("Create Restaurant Error: ", err);
    return res.status(500).json({ success: false, message: "Server error creating restaurant" });
  }
};

// Get all restaurants (Public)
exports.getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate("user", "name email phone");

    return res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants
    });
  } catch (err) {
    console.error("Get Restaurants Error: ", err);
    return res.status(500).json({ success: false, message: "Server error fetching restaurants" });
  }
};

// Get a single restaurant by ID (Public)
exports.getRestaurantById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID format" });
    }

    const restaurant = await Restaurant.findById(req.params.id).populate("user", "name email phone");
    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    return res.status(200).json({ success: true, restaurant });
  } catch (err) {
    console.error("Get Restaurant By ID Error: ", err);
    return res.status(500).json({ success: false, message: "Server error fetching restaurant details" });
  }
};

// Update restaurant status or details (Owner / Admin)
exports.updateRestaurant = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid restaurant ID format" });
    }

    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    }

    // Ownership check: Verify logged-in user owns this restaurant OR is an admin
    if (restaurant.user?.toString() !== req.user.id && !['admin', 'superAdmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Unauthorized: You do not own this restaurant" });
    }

    Object.assign(restaurant, req.body);
    const updatedRestaurant = await restaurant.save();

    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      restaurant: updatedRestaurant
    });
  } catch (err) {
    console.error("Update Restaurant Error: ", err);
    return res.status(500).json({ success: false, message: "Server error updating restaurant" });
  }
};