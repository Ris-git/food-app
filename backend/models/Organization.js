const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usage: {
      restaurantCount: { type: Number, default: 0, min: 0 },
      staffSeats: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
