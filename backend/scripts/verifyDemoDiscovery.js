require('dotenv').config();

const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const express = require('express');
const publicRoutes = require('../routes/publicRoutes');

async function run() {
  const target = process.argv.find((arg) => arg.startsWith('--target='))?.split('=')[1];
  const uri = process.env.MONGODB_URI;
  if (!['local', 'atlas'].includes(target) || !uri) throw new Error('Usage: npm run verify:demo-discovery -- --target=local|atlas');
  if (target === 'atlas' && !uri.startsWith('mongodb+srv://')) throw new Error('Atlas target requires an SRV URI.');
  if (target === 'local' && !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri)) throw new Error('Local target requires a localhost URI.');
  if ((process.env.MONGODB_DB_NAME || 'FoodDB') !== 'FoodDB') throw new Error('Unexpected database name.');
  await mongoose.connect(uri, { dbName: 'FoodDB' });

  const app = express();
  app.use('/public', publicRoutes);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const request = async (path) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/public${path}`);
    const body = await response.json();
    assert.equal(response.status, 200, `${path}: ${body.message || response.status}`);
    return body;
  };
  const names = (items) => items.filter((item) => item.isDemo).map((item) => item.name).sort();
  const check = async (query, expected) => {
    const body = await request(`/restaurants?${query}`);
    assert.deepEqual(names(body.restaurants), expected.sort(), query);
  };

  try {
    const listing = await request('/restaurants');
    const demoRestaurants = listing.restaurants.filter((item) => item.isDemo);
    assert.equal(demoRestaurants.length, 4, 'Expected exactly four demo restaurants.');
    assert(demoRestaurants.every((item) => item.logoUrl.startsWith('/demo-restaurants/') && item.isOpenNow));
    await check('location=Indiranagar', ['Spice Route']);
    await check('location=Bangalore', ['Biryani House', 'Green Bowl', 'Pizza Corner', 'Spice Route']);
    await check('location=Whitefield', ['Pizza Corner']);
    await check('search=Paneer%20Tikka', ['Spice Route']);
    await check('search=Green%20Goddess', ['Green Bowl']);
    await check('search=pizza', ['Pizza Corner']);
    await check('category=biryani', ['Biryani House']);
    await check('category=pizza', ['Pizza Corner']);
    await check('category=healthy', ['Green Bowl']);
    await check('category=snacks', ['Biryani House', 'Green Bowl', 'Spice Route']);
    await check('dietary=non-veg', ['Biryani House', 'Pizza Corner', 'Spice Route']);
    await check('priceLevel=1', ['Green Bowl', 'Spice Route']);
    await check('priceLevel=2', ['Biryani House']);
    await check('priceLevel=3', ['Pizza Corner']);
    await check('openNow=true', ['Biryani House', 'Green Bowl', 'Pizza Corner', 'Spice Route']);
    await check('latitude=12.9784&longitude=77.6408&radiusKm=5', ['Spice Route']);
    for (const restaurant of demoRestaurants) {
      const detail = await request(`/restaurants/${restaurant.id}`);
      assert.equal(detail.restaurant.name, restaurant.name);
      const menu = await request(`/restaurants/${restaurant.id}/menu`);
      assert.equal(menu.menuItems.length, 6, `${restaurant.name} menu count`);
      assert(menu.menuItems.every((item) => item.isAvailable));
    }
    console.log('Demo discovery API checks passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
}

run().catch((error) => { console.error('Demo discovery verification failed:', error.message); process.exitCode = 1; });
