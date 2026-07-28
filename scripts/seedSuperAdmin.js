require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const mongourl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/foodies_db';

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(mongourl, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB for seeding...');

    const superAdminData = {
      name: process.env.SUPERADMIN_NAME || 'Super Admin',
      email: process.env.SUPERADMIN_EMAIL || 'superadmin@foody.com',
      username: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!',
      phone: process.env.SUPERADMIN_PHONE || '9999999999',
      role: 'superAdmin',
    };

    let user = await User.findOne({
      $or: [{ username: superAdminData.username }, { email: superAdminData.email }],
    });

    if (user) {
      user.role = 'superAdmin';
      await user.save();
      console.log(`\n✅ Existing user '${user.username}' promoted to superAdmin successfully!`);
    } else {
      user = new User(superAdminData);
      await user.save();
      console.log(`\n✅ New superAdmin user '${user.username}' created successfully!`);
    }

    console.log('\nSuperAdmin Credentials:');
    console.log(` - Username: ${superAdminData.username}`);
    console.log(` - Email: ${superAdminData.email}`);
    console.log(` - Password: ${superAdminData.password}`);
    console.log(` - Role: ${user.role}\n`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
    process.exit(1);
  }
};

seedSuperAdmin();
