const mongoose = require('mongoose');

/**
 * Subscription — tracks what plan a restaurant is currently on.
 *
 * Design decisions:
 *  - Every restaurant always has exactly ONE Subscription document.
 *    Created automatically when admin approves the application.
 *  - status uses enum to prevent unexpected values ever being persisted.
 *  - plan is a reference (ObjectId), not a copy. This means the live plan
 *    limits are always read from the Plan document. Never mutate a Plan
 *    that has active subscribers — create a new Plan version instead.
 *  - Razorpay fields (providerPlanId, providerSubId) are null until the
 *    restaurant upgrades to a paid plan (Milestone 7).
 */
const subscriptionSchema = new mongoose.Schema(
  {
    // The restaurant this subscription belongs to
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      unique: true, // one restaurant = one subscription
    },

    // Reference to the Plan document (use .populate('plan') to get limits)
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },

    // Current lifecycle state of this subscription
    status: {
      type: String,
      enum: ['trial', 'active', 'past_due', 'cancelled', 'free'],
      default: 'trial',
    },

    // Which payment provider manages this subscription
    // 'none' = Free/Trial (no payment involved)
    provider: {
      type: String,
      enum: ['razorpay', 'none'],
      default: 'none',
    },

    // Razorpay's plan ID — set when restaurant upgrades (Milestone 6+)
    providerPlanId: {
      type: String,
      default: null,
    },

    // Razorpay's subscription ID — set when checkout completes (Milestone 7+)
    providerSubId: {
      type: String,
      default: null,
    },

    // Active billing period — set by Razorpay webhook on payment success
    currentPeriodStart: {
      type: Date,
      default: null,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },

    // When the 30-day trial expires (set at creation, null for paid plans)
    trialEndsAt: {
      type: Date,
      default: null,
    },

    // Set when restaurant explicitly cancels their subscription
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
