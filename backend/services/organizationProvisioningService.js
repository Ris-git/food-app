const Organization = require('../models/Organization');
const OrganizationMembership = require('../models/OrganizationMembership');

async function ensureOwnerOrganization({ userId, suggestedName, session = null }) {
  const query = OrganizationMembership.findOne({ user: userId, role: 'OWNER', status: 'ACTIVE' }).populate('organization');
  if (session) query.session(session);
  const existing = await query;
  if (existing?.organization) return { organization: existing.organization, membership: existing, created: false };

  const organizationDocs = await Organization.create([{
    name: String(suggestedName || 'Restaurant Organization').trim(),
    createdBy: userId,
  }], session ? { session } : undefined);
  const organization = organizationDocs[0];
  const membershipDocs = await OrganizationMembership.create([{
    organization: organization._id,
    user: userId,
    role: 'OWNER',
    status: 'ACTIVE',
  }], session ? { session } : undefined);
  return { organization, membership: membershipDocs[0], created: true };
}

module.exports = { ensureOwnerOrganization };
