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

const stagedMenuItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, default: true },
  },
  { _id: false }
);

const restaurantApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    applicationType: {
      type: String,
      enum: ['INITIAL', 'ADDITIONAL_LOCATION'],
      default: 'INITIAL',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    restaurantName: {
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
    description: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
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
    phone: {
      type: String,
      required: [true, 'Contact phone number is required'],
      trim: true,
    },
    cuisine: {
      type: String,
      required: [true, 'Cuisine type is required'],
      trim: true,
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
    stagedMenuItems: {
      type: [stagedMenuItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminRemarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

restaurantApplicationSchema.index({ location: '2dsphere' });
restaurantApplicationSchema.index({ organization: 1, status: 1 });

module.exports = mongoose.model('RestaurantApplication', restaurantApplicationSchema);
