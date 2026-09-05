const crypto = require('crypto');
const express = require('express');
const Organization = require('../models/Organization');
const OrganizationMembership = require('../models/OrganizationMembership');
const RestaurantMembership = require('../models/RestaurantMembership');
const StaffInvitation = require('../models/StaffInvitation');
const Restaurant = require('../models/Restaurant');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Order = require('../models/Order');
const RestaurantApplication = require('../models/RestaurantApplication');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const { checkEntitlement, FEATURES } = require('../services/entitlementService');
const {
  listOrganizationMemberships,
  getAccessibleRestaurants,
  requireOrganization,
} = require('../services/organizationAccessService');
const { sendEmail } = require('../services/email.service');

const router = express.Router();
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function subscriptionForOrganization(organizationId) {
  return Subscription.findOne({ organization: organizationId }).populate('plan');
}

async function reserveUsage(organizationId, field, limit) {
  const query = { _id: organizationId, status: 'ACTIVE' };
  if (limit !== -1) query[`usage.${field}`] = { $lt: limit };
  return Organization.findOneAndUpdate(query, { $inc: { [`usage.${field}`]: 1 } }, { returnDocument: 'after' });
}

async function expireInvitations(organizationId) {
  const expired = await StaffInvitation.find({ organization: organizationId, status: 'PENDING', expiresAt: { $lte: new Date() } }).select('_id');
  if (!expired.length) return;
  const result = await StaffInvitation.updateMany({ _id: { $in: expired.map((item) => item._id) }, status: 'PENDING' }, { $set: { status: 'EXPIRED' } });
  if (!result.modifiedCount) return;
  await Organization.updateOne({ _id: organizationId }, { $inc: { 'usage.staffSeats': -result.modifiedCount } });
  await Organization.updateOne({ _id: organizationId, 'usage.staffSeats': { $lt: 0 } }, { $set: { 'usage.staffSeats': 0 } });
}

router.get('/context', jwtAuthMiddleware, async (req, res) => {
  try {
    const memberships = await listOrganizationMemberships(req.user.id);
    const organizations = await Promise.all(memberships.map(async (membership) => {
      const { restaurants } = await getAccessibleRestaurants(req.user, membership.organization._id);
      return {
        ...membership.organization,
        membershipRole: membership.role,
        restaurants,
      };
    }));
    return res.json({ success: true, organizations });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load organization context.' });
  }
});

router.get('/:organizationId/overview', jwtAuthMiddleware, requireOrganization(), async (req, res) => {
  try {
    const { restaurants } = await getAccessibleRestaurants(req.user, req.organization._id);
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);
    const [subscription, orderSummary, staffCount, applications] = await Promise.all([
      subscriptionForOrganization(req.organization._id),
      Order.aggregate([
        { $match: { restaurant: { $in: restaurantIds } } },
        { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, '$totalPrice', 0] } } } },
      ]),
      OrganizationMembership.countDocuments({ organization: req.organization._id, role: { $ne: 'OWNER' }, status: 'ACTIVE' }),
      RestaurantApplication.find({ organization: req.organization._id, applicationType: 'ADDITIONAL_LOCATION' }).sort({ createdAt: -1 }).lean(),
    ]);
    return res.json({
      success: true,
      overview: {
        organization: req.organization,
        restaurants,
        restaurantCount: restaurants.length,
        staffCount,
        orders: orderSummary[0]?.orders || 0,
        revenue: orderSummary[0]?.revenue || 0,
        subscription,
        plan: subscription?.plan || null,
        restaurantApplications: applications,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load organization overview.' });
  }
});

router.post('/:organizationId/restaurants', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  let reserved = false;
  try {
    const subscription = await subscriptionForOrganization(req.organization._id);
    if (!subscription?.plan) return res.status(409).json({ success: false, message: 'Organization subscription is not configured.' });
    const [activeCount, pendingCount] = await Promise.all([
      Restaurant.countDocuments({ organization: req.organization._id, lifecycleStatus: 'ACTIVE' }),
      RestaurantApplication.countDocuments({ organization: req.organization._id, applicationType: 'ADDITIONAL_LOCATION', status: 'pending' }),
    ]);
    const currentCount = activeCount + pendingCount;
    const entitlement = await checkEntitlement(req.organization._id, FEATURES.CREATE_RESTAURANT, { currentCount, organizationId: req.organization._id });
    if (!entitlement.allowed) return res.status(403).json({ success: false, message: entitlement.reason });

    const reservation = await reserveUsage(req.organization._id, 'restaurantCount', subscription.plan.limits.restaurantLocations);
    if (!reservation) return res.status(409).json({ success: false, message: 'Restaurant limit was reached by another request.' });
    reserved = true;

    const name = String(req.body.name || '').trim();
    const address = String(req.body.address || '').trim();
    const phone = String(req.body.phone || '').trim();
    const cuisine = Array.isArray(req.body.cuisine)
      ? req.body.cuisine.map((item) => String(item).trim()).filter(Boolean).join(', ')
      : String(req.body.cuisine || '').trim();
    if (!name || !address || !phone) throw new Error('Restaurant name, address, and phone are required.');
    const application = await RestaurantApplication.create({
      user: req.user.id,
      organization: req.organization._id,
      applicationType: 'ADDITIONAL_LOCATION',
      restaurantName: name,
      franchiseName: String(req.body.franchiseName || '').trim(),
      phone,
      cuisine: cuisine || 'Other',
      address,
      formattedAddress: String(req.body.formattedAddress || address).trim(),
      status: 'pending',
    });
    return res.status(201).json({ success: true, application, message: 'Restaurant submitted for admin approval.' });
  } catch (error) {
    if (reserved) await Organization.updateOne({ _id: req.organization._id, 'usage.restaurantCount': { $gt: 0 } }, { $inc: { 'usage.restaurantCount': -1 } });
    return res.status(400).json({ success: false, message: error.message || 'Failed to create restaurant.' });
  }
});

router.delete('/:organizationId/restaurants/:restaurantId', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.restaurantId, organization: req.organization._id, lifecycleStatus: 'ACTIVE' });
  if (!restaurant) return res.status(404).json({ success: false, message: 'Active restaurant not found.' });
  const remaining = await Restaurant.countDocuments({ organization: req.organization._id, lifecycleStatus: 'ACTIVE' });
  if (remaining <= 1) return res.status(409).json({ success: false, message: 'An organization must keep at least one active restaurant.' });
  restaurant.lifecycleStatus = 'ARCHIVED';
  restaurant.operationalStatus = 'CLOSED';
  await restaurant.save();
  await Promise.all([
    RestaurantMembership.updateMany({ restaurant: restaurant._id }, { $set: { status: 'SUSPENDED' } }),
    Organization.updateOne({ _id: req.organization._id, 'usage.restaurantCount': { $gt: 0 } }, { $inc: { 'usage.restaurantCount': -1 } }),
  ]);
  return res.json({ success: true, message: 'Restaurant archived.' });
});

router.get('/:organizationId/staff', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    await expireInvitations(req.organization._id);
    const [memberships, assignments, invitations, subscription] = await Promise.all([
      OrganizationMembership.find({ organization: req.organization._id }).populate('user', 'name email username phone').lean(),
      RestaurantMembership.find({ organization: req.organization._id }).populate('restaurant', 'name').lean(),
      StaffInvitation.find({ organization: req.organization._id, status: 'PENDING' }).select('-tokenHash').lean(),
      subscriptionForOrganization(req.organization._id),
    ]);
    const members = memberships.map((membership) => ({
      ...membership,
      assignments: assignments.filter((assignment) => assignment.user.toString() === membership.user._id.toString()),
    }));
    return res.json({
      success: true,
      members,
      invitations,
      usage: {
        staff: req.organization.usage?.staffSeats || 0,
        limit: subscription?.plan?.limits?.staffAccounts ?? 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load staff.' });
  }
});

router.post('/:organizationId/invitations', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  let reserved = false;
  try {
    await expireInvitations(req.organization._id);
    req.organization = await Organization.findById(req.organization._id).lean();
    const email = String(req.body.email || '').trim().toLowerCase();
    const assignments = Array.isArray(req.body.restaurantAssignments) ? req.body.restaurantAssignments : [];
    if (!email || !assignments.length) return res.status(400).json({ success: false, message: 'Email and at least one restaurant assignment are required.' });
    const invitingUser = await User.findById(req.user.id).select('email').lean();
    if (invitingUser?.email && invitingUser.email.trim().toLowerCase() === email) {
      return res.status(409).json({ success: false, message: 'You cannot invite your own account.' });
    }

    const validRestaurants = await Restaurant.countDocuments({
      _id: { $in: assignments.map((item) => item.restaurant) },
      organization: req.organization._id,
      lifecycleStatus: 'ACTIVE',
    });
    if (validRestaurants !== new Set(assignments.map((item) => String(item.restaurant))).size) {
      return res.status(400).json({ success: false, message: 'Every assigned restaurant must belong to this organization.' });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser && await OrganizationMembership.exists({ organization: req.organization._id, user: existingUser._id, status: 'ACTIVE' })) {
      return res.status(409).json({ success: false, message: 'This user is already an active member.' });
    }

    const subscription = await subscriptionForOrganization(req.organization._id);
    const currentCount = req.organization.usage?.staffSeats || 0;
    const entitlement = await checkEntitlement(req.organization._id, FEATURES.INVITE_STAFF, { currentCount, organizationId: req.organization._id });
    if (!entitlement.allowed) return res.status(403).json({ success: false, message: entitlement.reason });
    const reservation = await reserveUsage(req.organization._id, 'staffSeats', subscription.plan.limits.staffAccounts);
    if (!reservation) return res.status(409).json({ success: false, message: 'Staff limit was reached by another request.' });
    reserved = true;

    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await StaffInvitation.create({
      organization: req.organization._id,
      email,
      role: req.body.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
      restaurantAssignments: assignments,
      invitedBy: req.user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const inviteUrl = `${baseUrl}/invitations/accept?staffInvite=${token}`;
    if (process.env.DISABLE_EMAIL_DELIVERY !== 'true') {
      try {
        await sendEmail({ to: email, subject: `Join ${req.organization.name} on Foody`, text: `Accept your invitation: ${inviteUrl}` });
      } catch (emailError) {
        console.warn('[Staff invitation] Email delivery failed:', emailError.message);
      }
    }
    return res.status(201).json({ success: true, invitation: { ...invitation.toObject(), tokenHash: undefined }, inviteUrl: process.env.NODE_ENV === 'production' ? undefined : inviteUrl });
  } catch (error) {
    if (reserved) await Organization.updateOne({ _id: req.organization._id, 'usage.staffSeats': { $gt: 0 } }, { $inc: { 'usage.staffSeats': -1 } });
    const duplicate = error?.code === 11000;
    return res.status(duplicate ? 409 : 400).json({ success: false, message: duplicate ? 'A pending invitation already exists for this email.' : error.message });
  }
});

router.post('/invitations/:token/accept', jwtAuthMiddleware, async (req, res) => {
  let claimedInvitation = null;
  try {
    const preview = await StaffInvitation.findOne({ tokenHash: hashToken(req.params.token), status: 'PENDING', expiresAt: { $gt: new Date() } });
    if (!preview) throw new Error('Invitation is invalid or expired.');
    const user = await User.findById(req.user.id);
    if (!user || user.email.toLowerCase() !== preview.email) throw new Error('Sign in using the invited email address.');

    claimedInvitation = await StaffInvitation.findOneAndUpdate(
      { _id: preview._id, status: 'PENDING' },
      { $set: { status: 'ACCEPTED', acceptedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!claimedInvitation) throw new Error('Invitation has already been used.');

    const membership = await OrganizationMembership.findOneAndUpdate(
      { organization: claimedInvitation.organization, user: user._id },
      { $set: { role: claimedInvitation.role, status: 'ACTIVE', joinedAt: new Date() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    for (const assignment of claimedInvitation.restaurantAssignments) {
      await RestaurantMembership.findOneAndUpdate(
        { restaurant: assignment.restaurant, user: user._id },
        { $set: { organization: claimedInvitation.organization, role: assignment.role, status: 'ACTIVE' } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }
    if (user.role === 'customer') { user.role = 'restaurant'; await user.save(); }
    return res.json({ success: true, membership, message: 'Invitation accepted.' });
  } catch (error) {
    if (claimedInvitation) await StaffInvitation.updateOne({ _id: claimedInvitation._id, status: 'ACCEPTED' }, { $set: { status: 'PENDING', acceptedAt: null } });
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:organizationId/invitations/:invitationId', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  const invitation = await StaffInvitation.findOneAndUpdate(
    { _id: req.params.invitationId, organization: req.organization._id, status: 'PENDING' },
    { $set: { status: 'REVOKED' } },
    { returnDocument: 'after' }
  );
  if (!invitation) return res.status(404).json({ success: false, message: 'Pending invitation not found.' });
  await Organization.updateOne({ _id: req.organization._id, 'usage.staffSeats': { $gt: 0 } }, { $inc: { 'usage.staffSeats': -1 } });
  return res.json({ success: true, message: 'Invitation revoked.' });
});

router.patch('/:organizationId/staff/:membershipId', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  try {
    const membership = await OrganizationMembership.findOne({ _id: req.params.membershipId, organization: req.organization._id });
    if (!membership || membership.role === 'OWNER') return res.status(404).json({ success: false, message: 'Editable staff member not found.' });

    if (Array.isArray(req.body.restaurantAssignments)) {
      const requestedIds = [...new Set(req.body.restaurantAssignments.map((item) => String(item.restaurant)))];
      const validCount = await Restaurant.countDocuments({ _id: { $in: requestedIds }, organization: req.organization._id, lifecycleStatus: 'ACTIVE' });
      if (validCount !== requestedIds.length) return res.status(400).json({ success: false, message: 'Every assignment must belong to this organization.' });
    }

    if (req.body.role) membership.role = req.body.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const previousStatus = membership.status;
    if (req.body.status) membership.status = req.body.status;
    await membership.save();
    if (previousStatus !== membership.status) {
      await Organization.updateOne({ _id: req.organization._id }, { $inc: { 'usage.staffSeats': membership.status === 'ACTIVE' ? 1 : -1 } });
    }

    if (Array.isArray(req.body.restaurantAssignments)) {
      await RestaurantMembership.deleteMany({ organization: req.organization._id, user: membership.user });
      const validRoles = new Set(['MANAGER', 'KITCHEN', 'CASHIER', 'ANALYST']);
      const documents = req.body.restaurantAssignments
        .filter((item) => validRoles.has(item.role))
        .map((item) => ({ organization: req.organization._id, restaurant: item.restaurant, user: membership.user, role: item.role }));
      if (documents.length) await RestaurantMembership.insertMany(documents);
    }
    return res.json({ success: true, membership });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:organizationId/staff/:membershipId', jwtAuthMiddleware, requireOrganization(['OWNER', 'ADMIN']), async (req, res) => {
  const membership = await OrganizationMembership.findOne({ _id: req.params.membershipId, organization: req.organization._id });
  if (!membership || membership.role === 'OWNER') return res.status(404).json({ success: false, message: 'Removable staff member not found.' });
  await Promise.all([
    RestaurantMembership.deleteMany({ organization: req.organization._id, user: membership.user }),
    membership.deleteOne(),
    membership.status === 'ACTIVE'
      ? Organization.updateOne({ _id: req.organization._id, 'usage.staffSeats': { $gt: 0 } }, { $inc: { 'usage.staffSeats': -1 } })
      : Promise.resolve(),
  ]);
  return res.json({ success: true, message: 'Staff access removed.' });
});

module.exports = router;
