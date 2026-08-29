const mongoose = require('mongoose');

const organizationMembershipSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['OWNER', 'ADMIN', 'STAFF'], required: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

organizationMembershipSchema.index({ organization: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('OrganizationMembership', organizationMembershipSchema);
