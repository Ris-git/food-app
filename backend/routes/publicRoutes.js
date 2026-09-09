const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const discoveryCategories = require('../config/discoveryCategories');
const { getPublicAvailability } = require('../services/restaurantAvailabilityService');
const { distanceBetweenKm, estimatedDeliveryMinutes, priceLevelForAverage } = require('../services/restaurantDiscoveryService');

const router = express.Router();
const publicRestaurantMatch = { lifecycleStatus: 'ACTIVE' };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const safeRestaurant = (restaurant, rating, menuSummary, originCoordinates) => {
  const availability = getPublicAvailability(restaurant);
  const distanceKm = distanceBetweenKm(originCoordinates, restaurant.location?.coordinates);
  const priceLevel = priceLevelForAverage(menuSummary?.averagePrice);
  return {
    id: restaurant._id,
    name: restaurant.name,
    logoUrl: restaurant.logoUrl || '',
    description: restaurant.description || '',
    address: restaurant.formattedAddress || restaurant.address,
    cuisines: restaurant.cuisine || [],
    operationalStatus: availability.operationalStatus,
    isOpenNow: availability.isOpenNow,
    operatingHours: restaurant.operatingHours,
    location: restaurant.location,
    rating: rating?.averageRating ? Number(rating.averageRating.toFixed(1)) : null,
    reviewCount: rating?.reviewCount || 0,
    distanceKm,
    estimatedDeliveryMinutes: estimatedDeliveryMinutes(distanceKm),
    priceLevel,
    priceRange: priceLevel ? '₹'.repeat(priceLevel) : null,
    menuTypes: menuSummary?.menuTypes || [],
  };
};

router.get('/restaurants', async (req, res) => {
  try {
    const match = { ...publicRestaurantMatch };
    const location = String(req.query.location || '').trim();
    const cuisine = String(req.query.cuisine || '').trim();
    const categorySlug = String(req.query.category || '').trim();
    const search = String(req.query.search || '').trim();
    const dietary = String(req.query.dietary || '').trim();
    const minimumRating = Number(req.query.minimumRating || 0);
    const priceLevel = Number(req.query.priceLevel || 0);
    const openNow = req.query.openNow === 'true';
    const sort = String(req.query.sort || 'newest');
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const originCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) ? [longitude, latitude] : null;
    if (dietary && !['veg', 'non-veg'].includes(dietary)) return res.status(400).json({ success: false, message: 'Unknown dietary filter.' });
    if (![0, 1, 2, 3].includes(priceLevel)) return res.status(400).json({ success: false, message: 'Unknown price filter.' });
    if (minimumRating < 0 || minimumRating > 5) return res.status(400).json({ success: false, message: 'Unknown rating filter.' });
    if (!['newest', 'rating', 'deliveryTime'].includes(sort)) return res.status(400).json({ success: false, message: 'Unknown sorting option.' });
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
    if (dietary) {
      const matchingRestaurantIds = await MenuItem.distinct('restaurant', { isAvailable: true, type: dietary });
      clauses.push({ _id: { $in: matchingRestaurantIds } });
    }
    if (clauses.length) match.$and = clauses;

    const restaurants = await Restaurant.find(match).sort({ createdAt: -1 }).limit(100).lean();
    const ratings = await Review.aggregate([
      { $match: { restaurant: { $in: restaurants.map((item) => item._id) } } },
      { $group: { _id: '$restaurant', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratings.map((item) => [String(item._id), item]));
    const menuSummaries = await MenuItem.aggregate([
      { $match: { restaurant: { $in: restaurants.map((item) => item._id) }, isAvailable: true } },
      { $group: { _id: '$restaurant', averagePrice: { $avg: '$price' }, menuTypes: { $addToSet: '$type' } } },
    ]);
    const menuSummaryMap = new Map(menuSummaries.map((item) => [String(item._id), item]));
    let results = restaurants.map((item) => safeRestaurant(item, ratingMap.get(String(item._id)), menuSummaryMap.get(String(item._id)), originCoordinates));
    if (openNow) results = results.filter((item) => item.isOpenNow);
    if (minimumRating) results = results.filter((item) => (item.rating || 0) >= minimumRating);
    if (priceLevel) results = results.filter((item) => item.priceLevel === priceLevel);
    if (sort === 'rating') results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'deliveryTime') results.sort((a, b) => a.estimatedDeliveryMinutes - b.estimatedDeliveryMinutes);
    return res.json({ success: true, restaurants: results });
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
    const menuSummary = await MenuItem.aggregate([
      { $match: { restaurant: restaurant._id, isAvailable: true } },
      { $group: { _id: '$restaurant', averagePrice: { $avg: '$price' }, menuTypes: { $addToSet: '$type' } } },
    ]);
    return res.json({ success: true, restaurant: safeRestaurant(restaurant, rating[0], menuSummary[0], null) });
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
