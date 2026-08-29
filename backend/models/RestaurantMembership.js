const mongoose = require('mongoose');

const restaurantMembershipSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['OWNER', 'MANAGER', 'KITCHEN', 'CASHIER', 'ANALYST'],
      required: true,
    },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

restaurantMembershipSchema.index({ restaurant: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('RestaurantMembership', restaurantMembershipSchema);
