require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const TEST_USERNAMES = ['foody_free_test', 'foody_growth_test', 'foody_pro_test'];

const MENU = [
  { title: 'Paneer Tikka', type: 'veg', description: 'Char-grilled cottage cheese with peppers and house spices.', price: 279 },
  { title: 'Butter Chicken', type: 'non-veg', description: 'Tandoori chicken in a creamy tomato and butter gravy.', price: 349 },
  { title: 'Veg Biryani', type: 'veg', description: 'Fragrant basmati rice cooked with vegetables and aromatic spices.', price: 249 },
  { title: 'Chicken Biryani', type: 'non-veg', description: 'Spiced chicken layered with saffron basmati rice.', price: 329 },
  { title: 'Masala Lemonade', type: 'beverage', description: 'Fresh lime, mint and roasted cumin served chilled.', price: 99 },
  { title: 'Gulab Jamun', type: 'dessert', description: 'Warm milk-solid dumplings soaked in cardamom syrup.', price: 129 },
];

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');

  const databaseName = process.env.MONGODB_DB_NAME || 'FoodDB';
  if (databaseName !== 'FoodDB') {
    throw new Error(`Refusing to seed unexpected database: ${databaseName}`);
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName });
  console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);

  const users = await User.find({ username: { $in: TEST_USERNAMES } }).select('_id username');
  if (users.length === 0) {
    throw new Error('No designated test users found. Run npm run seed:test-accounts first.');
  }

  for (const user of users) {
    const restaurants = await Restaurant.find({ user: user._id, lifecycleStatus: 'ACTIVE' }).select('_id name');
    for (const restaurant of restaurants) {
      const operations = MENU.map((item) => ({
        updateOne: {
          filter: { restaurant: restaurant._id, title: item.title },
          update: { $set: { ...item, isAvailable: true } },
          upsert: true,
        },
      }));
      await MenuItem.bulkWrite(operations);
      console.log(`Seeded ${MENU.length} menu items for ${restaurant.name} (${user.username})`);
    }
  }
}

run()
  .catch((error) => {
    console.error('Test menu seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
