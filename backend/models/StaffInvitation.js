const mongoose = require('mongoose');

const staffInvitationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['ADMIN', 'STAFF'], default: 'STAFF' },
    restaurantAssignments: [{
      restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
      role: { type: String, enum: ['MANAGER', 'KITCHEN', 'CASHIER', 'ANALYST'], required: true },
    }],
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'], default: 'PENDING' },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

staffInvitationSchema.index(
  { organization: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

module.exports = mongoose.model('StaffInvitation', staffInvitationSchema);
