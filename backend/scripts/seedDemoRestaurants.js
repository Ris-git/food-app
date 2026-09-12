require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Review = require('../models/Review');

// Demo images are published with the frontend, so these paths work on Vercel and locally.
const fixtures = [
  {
    key: 'spice-route', username: 'foody_free_test', oldName: 'Free Test Kitchen',
    name: 'Spice Route', area: 'Indiranagar', coordinates: [77.6408, 12.9784],
    cuisine: ['North Indian', 'Indian'], image: '/demo-restaurants/spice-route.jpg',
    description: 'A demo kitchen for North Indian favourites and fresh tandoor snacks.',
    menu: [
      ['Paneer Tikka', 'veg', 'Char-grilled paneer, peppers and mint chutney.', 259],
      ['Dal Makhani', 'veg', 'Slow-cooked black lentils with cream and spices.', 229],
      ['Butter Chicken', 'non-veg', 'Tandoori chicken in a creamy tomato gravy.', 349],
      ['Garlic Naan', 'veg', 'Fresh tandoor bread with garlic and herbs.', 89],
      ['Samosa Chaat', 'veg', 'Crisp samosa with chickpeas, yogurt and chutneys.', 179],
      ['Masala Chai', 'beverage', 'Hot tea brewed with aromatic Indian spices.', 79],
    ],
  },
  {
    key: 'biryani-house', username: 'foody_growth_test', oldName: 'Growth Test Kitchen',
    name: 'Biryani House', area: 'Koramangala', coordinates: [77.6245, 12.9352],
    cuisine: ['Biryani', 'Indian'], image: '/demo-restaurants/biryani-house.jpg',
    description: 'A demo kitchen serving fragrant biryani and familiar Indian sides.',
    menu: [
      ['Chicken Biryani', 'non-veg', 'Spiced chicken layered with saffron basmati rice.', 329],
      ['Veg Biryani', 'veg', 'Aromatic basmati rice with vegetables and whole spices.', 249],
      ['Paneer Biryani', 'veg', 'Basmati rice layered with spiced paneer.', 279],
      ['Chicken Tikka', 'non-veg', 'Smoky tandoori chicken pieces with mint chutney.', 299],
      ['Gulab Jamun', 'dessert', 'Warm milk-solid dumplings in cardamom syrup.', 129],
      ['Masala Lemonade', 'beverage', 'Fresh lime, mint and roasted cumin.', 99],
    ],
  },
  {
    key: 'green-bowl', username: 'foody_pro_test', oldName: 'Pro Test Kitchen',
    name: 'Green Bowl', area: 'HSR Layout', coordinates: [77.6387, 12.9116],
    cuisine: ['Healthy', 'Vegetarian'], image: '/demo-restaurants/green-bowl.jpg',
    description: 'A demo kitchen with colourful vegetarian bowls, snacks and smoothies.',
    menu: [
      ['Green Goddess Bowl', 'veg', 'Rice, greens, avocado, cucumber and herb dressing.', 189],
      ['Roasted Chickpea Bowl', 'veg', 'Chickpeas, seasonal vegetables and lemon tahini.', 179],
      ['Paneer Protein Bowl', 'veg', 'Grilled paneer, quinoa and crunchy salad.', 229],
      ['Sweet Potato Chaat', 'veg', 'Roasted sweet potato with tangy chutney.', 149],
      ['Mango Smoothie', 'beverage', 'Mango blended with yogurt and a little honey.', 129],
      ['Fruit Yogurt Cup', 'dessert', 'Fresh fruit with lightly sweetened yogurt.', 119],
    ],
  },
  {
    key: 'pizza-corner', username: 'foody_pro_test', oldName: 'Sub Pro Test Kitchen',
    name: 'Pizza Corner', area: 'Whitefield', coordinates: [77.7499, 12.9698],
    cuisine: ['Italian', 'Pizza'], image: '/demo-restaurants/pizza-corner.jpg',
    description: 'A demo pizzeria with baked classics, sides and desserts.',
    menu: [
      ['Margherita Pizza', 'veg', 'Tomato, mozzarella and fresh basil.', 499],
      ['Farmhouse Pizza', 'veg', 'Peppers, onion, mushrooms and mozzarella.', 549],
      ['Pepperoni Pizza', 'non-veg', 'Pepperoni, tomato sauce and melted cheese.', 599],
      ['Garlic Bread', 'veg', 'Baked bread with garlic butter and herbs.', 299],
      ['Tiramisu', 'dessert', 'Coffee-soaked sponge with creamy mascarpone.', 349],
      ['Iced Coffee', 'beverage', 'Chilled coffee with milk and ice.', 249],
    ],
  },
];

const legacyMenuTitles = new Set(['Paneer Tikka', 'Butter Chicken', 'Veg Biryani', 'Chicken Biryani', 'Masala Lemonade', 'Gulab Jamun']);
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const allDayHours = Object.fromEntries(days.map((day) => [day, { isOpen: true, openTime: '00:00', closeTime: '00:00' }]));

async function run() {
  const args = process.argv.slice(2);
  const target = args.find((arg) => arg.startsWith('--target='))?.split('=')[1];
  const apply = args.includes('--apply');
  if (!['local', 'atlas'].includes(target) || args.some((arg) => arg !== '--apply' && arg !== `--target=${target}`)) {
    throw new Error('Usage: npm run seed:demo-restaurants -- --target=local|atlas [--apply]. Without --apply this is a dry run.');
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  if (target === 'atlas' && !uri.startsWith('mongodb+srv://')) throw new Error('Atlas target requires an SRV connection string.');
  if (target === 'local' && !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri)) throw new Error('Local target requires a localhost MongoDB URI.');
  const databaseName = process.env.MONGODB_DB_NAME || 'FoodDB';
  if (databaseName !== 'FoodDB') throw new Error(`Refusing unexpected database: ${databaseName}`);

  await mongoose.connect(uri, { dbName: databaseName });
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${target} / ${mongoose.connection.name}`);
  const plans = [];
  for (const fixture of fixtures) {
    const user = await User.findOne({ username: fixture.username }).select('_id username');
    if (!user) throw new Error(`Designated test user ${fixture.username} is missing.`);
    const restaurant = await Restaurant.findOne({ user: user._id, $or: [{ demoFixtureKey: fixture.key }, { name: fixture.oldName }] });
    if (!restaurant || restaurant.lifecycleStatus !== 'ACTIVE') throw new Error(`Expected active test restaurant ${fixture.oldName} is missing.`);
    const conflicts = await Restaurant.countDocuments({ demoFixtureKey: fixture.key, _id: { $ne: restaurant._id } });
    if (conflicts) throw new Error(`Fixture key ${fixture.key} is already used by another restaurant.`);
    const [orders, reviews, menu] = await Promise.all([
      Order.countDocuments({ restaurant: restaurant._id }),
      Review.countDocuments({ restaurant: restaurant._id }),
      MenuItem.find({ restaurant: restaurant._id }).sort({ _id: 1 }),
    ]);
    if (orders || reviews) throw new Error(`Refusing to repurpose ${restaurant.name}: it has orders or reviews.`);
    const expectedTitles = new Set(fixture.menu.map(([title]) => title));
    if (menu.length > fixture.menu.length || menu.some((item) => !legacyMenuTitles.has(item.title) && !expectedTitles.has(item.title))) {
      throw new Error(`Refusing to repurpose ${restaurant.name}: menu contains non-fixture items.`);
    }
    plans.push({ fixture, restaurant, menu });
    console.log(`${restaurant.name} (${fixture.username}) -> ${fixture.name}; ${menu.length} existing menu items -> ${fixture.menu.length}; ${fixture.area}, Bengaluru`);
  }
  if (!apply) return console.log('No database writes made. Add --apply to execute this plan.');

  // Atlas is a replica set, so commit all four fixtures together or roll them all back.
  const writePlans = async (session) => {
    const options = session ? { session } : {};
    for (const { fixture, restaurant, menu } of plans) {
      const used = new Set();
      for (const [title, type, description, price] of fixture.menu) {
        const existing = menu.find((item) => item.title === title && !used.has(String(item._id)))
          || menu.find((item) => !used.has(String(item._id)));
        const payload = { title, type, description, price, isAvailable: true, restaurant: restaurant._id };
        if (existing) {
          used.add(String(existing._id));
          await MenuItem.updateOne({ _id: existing._id }, { $set: payload }, options);
        } else {
          await MenuItem.create([payload], options);
        }
      }
      await Restaurant.updateOne({ _id: restaurant._id }, { $set: {
        demoFixtureKey: fixture.key,
        name: fixture.name,
        description: fixture.description,
        logoUrl: fixture.image,
        cuisine: fixture.cuisine,
        address: `${fixture.area}, Bengaluru, Karnataka`,
        formattedAddress: `${fixture.area}, Bengaluru, Karnataka`,
        location: { type: 'Point', coordinates: fixture.coordinates },
        operatingHours: allDayHours,
        operationalStatus: 'OPEN',
      } }, options);
    }
  };
  if (target === 'atlas') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => writePlans(session));
    } finally {
      await session.endSession();
    }
  } else {
    await writePlans(null);
  }
  console.log(`Updated ${plans.map(({ fixture }) => fixture.name).join(', ')}.`);
}

run()
  .catch((error) => { console.error('Demo restaurant setup failed:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
