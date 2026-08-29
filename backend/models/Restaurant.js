const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema(
  {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '22:00' },
  },
  { _id: false }
);

const mealSlotSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: true },
    start: { type: String, default: '08:00' },
    end: { type: String, default: '11:00' },
  },
  { _id: false }
);

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
    },
    franchiseName: {
      type: String,
      trim: true,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    cuisine: {
      type: [String],
      default: [],
    },
    address: {
      type: String,
      required: [true, 'Restaurant address is required'],
    },
    formattedAddress: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    operatingHours: {
      monday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
      tuesday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
      wednesday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
      thursday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
      friday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
      saturday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
      sunday: { type: dayScheduleSchema, default: () => ({ isOpen: true, openTime: '09:00', closeTime: '22:00' }) },
    },
    mealSlots: {
      breakfast: { type: mealSlotSchema, default: () => ({ active: true, start: '08:00', end: '11:00' }) },
      lunch: { type: mealSlotSchema, default: () => ({ active: true, start: '12:00', end: '16:00' }) },
      dinner: { type: mealSlotSchema, default: () => ({ active: true, start: '19:00', end: '23:00' }) },
    },
    operationalStatus: {
      type: String,
      enum: ['OPEN', 'CLOSED', 'TEMPORARILY_UNAVAILABLE', 'BUSY'],
      default: 'OPEN',
    },
    // The vendor/owner who manages this restaurant
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    lifecycleStatus: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ organization: 1, lifecycleStatus: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
