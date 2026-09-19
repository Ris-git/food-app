require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

const DATABASE_NAME = 'FoodDB';
const TEST_PASSWORD = 'FoodyCustomer!2026#Demo';

const fixtures = [
  {
    name: 'Customer Demo One',
    username: 'foody_customer_1',
    email: 'customer.one@foody.local',
    phone: '9000000201',
    addresses: [{ type: 'Home', addressLine: '12 Indiranagar Main Road', city: 'Bengaluru' }],
  },
  {
    name: 'Customer Demo Two',
    username: 'foody_customer_2',
    email: 'customer.two@foody.local',
    phone: '9000000202',
    addresses: [{ type: 'Work', addressLine: '80 Feet Road, Koramangala', city: 'Bengaluru' }],
  },
  {
    name: 'Customer Demo Three',
    username: 'foody_customer_3',
    email: 'customer.three@foody.local',
    phone: '9000000203',
    addresses: [{ type: 'Home', addressLine: 'Sector 2, HSR Layout', city: 'Bengaluru' }],
  },
];

async function upsertFixture(fixture, apply) {
  const conflict = await User.findOne({
    $or: [{ username: fixture.username }, { email: fixture.email }, { phone: fixture.phone }],
  });

  if (conflict && (conflict.username !== fixture.username || conflict.email !== fixture.email)) {
    throw new Error(`Identity conflict detected for ${fixture.username}; no changes made.`);
  }

  console.log(`${conflict ? 'Update' : 'Create'} customer fixture: ${fixture.username}`);
  if (!apply) return;

  const user = conflict || new User();
  Object.assign(user, fixture, {
    password: TEST_PASSWORD,
    role: 'customer',
    emailVerified: true,
    isVerified: true,
    verificationToken: null,
    verificationTokenExpires: null,
    verificationOTP: null,
    verificationOTPExpires: null,
    refreshToken: '',
  });
  await user.save();

  if (!(await user.comparePassword(TEST_PASSWORD)) || user.role !== 'customer') {
    throw new Error(`Verification failed for ${fixture.username}.`);
  }
}

async function run() {
  const args = process.argv.slice(2);
  const target = args.find((arg) => arg.startsWith('--target='))?.split('=')[1];
  const apply = args.includes('--apply');

  if (!['local', 'atlas'].includes(target) || args.some((arg) => arg !== '--apply' && arg !== `--target=${target}`)) {
    throw new Error('Usage: npm run seed:customer-accounts -- --target=local|atlas [--apply]. Without --apply this is a dry run.');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  if (target === 'atlas' && !uri.startsWith('mongodb+srv://')) throw new Error('Atlas target requires an SRV connection string.');
  if (target === 'local' && !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(uri)) {
    throw new Error('Local target requires a localhost MongoDB URI.');
  }
  if ((process.env.MONGODB_DB_NAME || DATABASE_NAME) !== DATABASE_NAME) {
    throw new Error(`Refusing unexpected database: ${process.env.MONGODB_DB_NAME}`);
  }

  await mongoose.connect(uri, { dbName: DATABASE_NAME });
  if (mongoose.connection.name !== DATABASE_NAME) throw new Error(`Connected to unexpected database: ${mongoose.connection.name}`);
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${target} / ${mongoose.connection.name}`);

  for (const fixture of fixtures) await upsertFixture(fixture, apply);
  if (!apply) console.log('No database writes made. Add --apply to execute this plan.');
  else console.log(`Seeded ${fixtures.length} customer accounts. Shared password: ${TEST_PASSWORD}`);
}

run()
  .catch((error) => {
    console.error('Customer account seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
