const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const discoveryCategories = require('../config/discoveryCategories');

const router = express.Router();
const publicRestaurantMatch = { lifecycleStatus: 'ACTIVE' };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeRestaurant = (restaurant, rating) => ({
  id: restaurant._id,
  name: restaurant.name,
  logoUrl: restaurant.logoUrl || '',
  description: restaurant.description || '',
  address: restaurant.formattedAddress || restaurant.address,
  cuisines: restaurant.cuisine || [],
  operationalStatus: restaurant.operationalStatus,
  operatingHours: restaurant.operatingHours,
  location: restaurant.location,
  rating: rating?.averageRating ? Number(rating.averageRating.toFixed(1)) : null,
  reviewCount: rating?.reviewCount || 0,
});

router.get('/restaurants', async (req, res) => {
  try {
    const match = { ...publicRestaurantMatch };
    const location = String(req.query.location || '').trim();
    const cuisine = String(req.query.cuisine || '').trim();
    const categorySlug = String(req.query.category || '').trim();
    const search = String(req.query.search || '').trim();
    const clauses = [];
    if (location) clauses.push({ $or: [{ address: { $regex: escapeRegex(location), $options: 'i' } }, { formattedAddress: { $regex: escapeRegex(location), $options: 'i' } }] });
    if (cuisine) clauses.push({ cuisine: { $regex: escapeRegex(cuisine), $options: 'i' } });
    if (search) clauses.push({ $or: [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { cuisine: { $regex: escapeRegex(search), $options: 'i' } }] });
    if (categorySlug) {
      const category = discoveryCategories.find((item) => item.slug === categorySlug);
      if (!category) return res.status(400).json({ success: false, message: 'Unknown discovery category.' });
      const menuClauses = [];
      if (category.menuTypes.length) menuClauses.push({ type: { $in: category.menuTypes } });
      if (category.keywords.length) {
        const keywordPattern = category.keywords.map(escapeRegex).join('|');
        menuClauses.push({ $or: [{ title: { $regex: keywordPattern, $options: 'i' } }, { description: { $regex: keywordPattern, $options: 'i' } }] });
      }
      const matchingRestaurantIds = await MenuItem.distinct('restaurant', {
        isAvailable: true,
        ...(menuClauses.length === 1 ? menuClauses[0] : { $or: menuClauses }),
      });
      clauses.push({ _id: { $in: matchingRestaurantIds } });
    }
    if (clauses.length) match.$and = clauses;

    const restaurants = await Restaurant.find(match).sort({ createdAt: -1 }).limit(100).lean();
    const ratings = await Review.aggregate([
      { $match: { restaurant: { $in: restaurants.map((item) => item._id) } } },
      { $group: { _id: '$restaurant', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratings.map((item) => [String(item._id), item]));
    return res.json({ success: true, restaurants: restaurants.map((item) => safeRestaurant(item, ratingMap.get(String(item._id)))) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to discover restaurants.' });
  }
});

router.get('/restaurants/:restaurantId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.restaurantId)) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    const restaurant = await Restaurant.findOne({ _id: req.params.restaurantId, ...publicRestaurantMatch }).lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    const rating = await Review.aggregate([
      { $match: { restaurant: restaurant._id } },
      { $group: { _id: '$restaurant', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
    ]);
    return res.json({ success: true, restaurant: safeRestaurant(restaurant, rating[0]) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load restaurant.' });
  }
});

router.get('/restaurants/:restaurantId/menu', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.restaurantId)) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    const restaurant = await Restaurant.exists({ _id: req.params.restaurantId, ...publicRestaurantMatch });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    const menuItems = await MenuItem.find({ restaurant: req.params.restaurantId, isAvailable: true })
      .select('title type description price isAvailable')
      .sort({ type: 1, title: 1 })
      .lean();
    return res.json({ success: true, menuItems });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load menu.' });
  }
});

router.get('/cuisines', async (_req, res) => {
  const cuisines = await Restaurant.distinct('cuisine', publicRestaurantMatch);
  return res.json({ success: true, cuisines: cuisines.filter(Boolean).sort() });
});

router.get('/categories', (_req, res) => {
  return res.json({
    success: true,
    categories: discoveryCategories.map(({ slug, name }) => ({ slug, name })),
  });
});

module.exports = router;
