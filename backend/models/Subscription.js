const mongoose = require('mongoose');

/**
 * Subscription — tracks what plan a restaurant is currently on.
 */
const subscriptionSchema = new mongoose.Schema(
  {
    // The restaurant this subscription belongs to
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
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
    providerStatus: {
      type: String,
      default: null,
    },
    lastProviderEventAt: {
      type: Date,
      default: null,
    },
    authenticatedAt: {
      type: Date,
      default: null,
    },

    // A Checkout attempt is not an entitlement. These fields keep the
    // requested plan separate until Razorpay verifies it in Milestone 8.
    pendingPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    pendingProviderSubId: {
      type: String,
      default: null,
    },
    pendingProviderStatus: {
      type: String,
      enum: ['created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'expired'],
      default: null,
    },
    pendingCreatedAt: {
      type: Date,
      default: null,
    },

    // Paid plan changes are scheduled at the next Razorpay billing boundary.
    // The current plan remains the entitlement source until the provider
    // confirms that the scheduled change has taken effect.
    scheduledPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    scheduledPlanChangeAt: {
      type: Date,
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
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    cancellationRequestedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index(
  { restaurant: 1 },
  { unique: true, partialFilterExpression: { restaurant: { $type: 'objectId' } } }
);
subscriptionSchema.index(
  { organization: 1 },
  { unique: true, partialFilterExpression: { organization: { $type: 'objectId' } } }
);
subscriptionSchema.index(
  { pendingProviderSubId: 1 },
  {
    unique: true,
    partialFilterExpression: { pendingProviderSubId: { $type: 'string' } },
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
