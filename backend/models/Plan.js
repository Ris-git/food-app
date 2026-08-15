const mongoose = require('mongoose');

/**
 * Plan — defines what Foody offers at each subscription tier.
 *
 * Design decisions:
 *  - Prices stored in PAISE (not rupees) to match Razorpay's unit system.
 *    Frontend converts: display = plan.price / 100
 *  - razorpayPlanId is optional — Free plan has no Razorpay counterpart.
 *  - limits.menuItems = -1 means unlimited.
 *  - isActive allows soft-disabling a plan without deleting it (existing
 *    subscribers keep their reference intact).
 */
const planLimitsSchema = new mongoose.Schema(
  {
    staffAccounts: {
      type: Number,
      required: true,
      default: 0,
      comment: 'Max staff accounts. -1 = unlimited.',
    },
    menuItems: {
      type: Number,
      required: true,
      default: 20,
      comment: 'Max menu items. -1 = unlimited.',
    },
    analyticsAccess: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    // Internal identifier — used in code logic (e.g. 'free', 'growth', 'pro')
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Human-readable label shown in the UI
    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    // Price in PAISE (INR). 99900 = ₹999. 0 = Free.
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },

    // 'monthly' | 'yearly' | 'none' (for free plan)
    billingInterval: {
      type: String,
      enum: ['monthly', 'yearly', 'none'],
      default: 'none',
    },

    // Number of free trial days before billing starts (0 = no trial)
    trialDays: {
      type: Number,
      default: 0,
    },

    // Razorpay's plan ID — only set for paid plans after creating them
    // in the Razorpay Test Dashboard (Milestone 6).
    razorpayPlanId: {
      type: String,
      default: null,
    },

    // Soft-delete flag: disable a plan without removing existing subscribers
    isActive: {
      type: Boolean,
      default: true,
    },

    // Feature limits enforced by the entitlement service
    limits: {
      type: planLimitsSchema,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
