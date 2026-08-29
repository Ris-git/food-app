const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const OrganizationMembership = require('../models/OrganizationMembership');
const RestaurantMembership = require('../models/RestaurantMembership');
const Restaurant = require('../models/Restaurant');

const RESTAURANT_PERMISSIONS = {
  VIEW_DASHBOARD: 'view:dashboard',
  MANAGE_SETTINGS: 'manage:settings',
  MANAGE_MENU: 'manage:menu',
  VIEW_ANALYTICS: 'view:analytics',
  MANAGE_ORDERS: 'manage:orders',
};

const RESTAURANT_ROLE_PERMISSIONS = {
  OWNER: Object.values(RESTAURANT_PERMISSIONS),
  MANAGER: Object.values(RESTAURANT_PERMISSIONS),
  KITCHEN: [RESTAURANT_PERMISSIONS.VIEW_DASHBOARD, RESTAURANT_PERMISSIONS.MANAGE_ORDERS],
  CASHIER: [RESTAURANT_PERMISSIONS.VIEW_DASHBOARD, RESTAURANT_PERMISSIONS.MANAGE_ORDERS],
  ANALYST: [RESTAURANT_PERMISSIONS.VIEW_DASHBOARD, RESTAURANT_PERMISSIONS.VIEW_ANALYTICS],
};

const isSystemAdmin = (user) => ['admin', 'superAdmin'].includes(user?.role);

function requestedId(req, header, query, body) {
  return req.headers[header] || req.query?.[query] || req.body?.[body] || null;
}

async function listOrganizationMemberships(userId) {
  return OrganizationMembership.find({ user: userId, status: 'ACTIVE' })
    .populate('organization')
    .lean();
}

async function resolveOrganizationForUser(user, organizationId = null) {
  if (organizationId && !mongoose.isValidObjectId(organizationId)) return null;

  if (isSystemAdmin(user) && organizationId) {
    const organization = await Organization.findById(organizationId).lean();
    return organization ? { organization, membership: null, isSystemAdmin: true } : null;
  }

  const query = { user: user.id, status: 'ACTIVE' };
  if (organizationId) query.organization = organizationId;
  const membership = await OrganizationMembership.findOne(query).populate('organization').lean();
  if (!membership?.organization || membership.organization.status !== 'ACTIVE') return null;
  return { organization: membership.organization, membership, isSystemAdmin: false };
}

async function getAccessibleRestaurants(user, organizationId) {
  const resolved = await resolveOrganizationForUser(user, organizationId);
  if (!resolved) return { resolved: null, restaurants: [] };

  const organization = resolved.organization;
  if (resolved.isSystemAdmin || ['OWNER', 'ADMIN'].includes(resolved.membership?.role)) {
    const restaurants = await Restaurant.find({ organization: organization._id, lifecycleStatus: 'ACTIVE' })
      .sort({ createdAt: 1 }).lean();
    return { resolved, restaurants };
  }

  const assignments = await RestaurantMembership.find({
    organization: organization._id,
    user: user.id,
    status: 'ACTIVE',
  }).select('restaurant role').lean();
  const roles = new Map(assignments.map((item) => [item.restaurant.toString(), item.role]));
  const restaurants = await Restaurant.find({ _id: { $in: [...roles.keys()] }, lifecycleStatus: 'ACTIVE' }).lean();
  return {
    resolved,
    restaurants: restaurants.map((restaurant) => ({ ...restaurant, accessRole: roles.get(restaurant._id.toString()) })),
  };
}

async function resolveRestaurantAccess(user, { organizationId = null, restaurantId = null, permission = null } = {}) {
  if (restaurantId && !mongoose.isValidObjectId(restaurantId)) return null;

  // Legacy compatibility before the organization backfill is run.
  if (!organizationId && restaurantId) {
    const legacyRestaurant = await Restaurant.findById(restaurantId).lean();
    if (legacyRestaurant && !legacyRestaurant.organization && legacyRestaurant.user?.toString() === user.id) {
      return { restaurant: legacyRestaurant, organization: null, organizationMembership: null, restaurantMembership: null };
    }
    organizationId = legacyRestaurant?.organization?.toString() || null;
  }

  if (!organizationId) {
    const first = await OrganizationMembership.findOne({ user: user.id, status: 'ACTIVE' }).lean();
    organizationId = first?.organization?.toString() || null;
  }

  const { resolved, restaurants } = await getAccessibleRestaurants(user, organizationId);
  if (!resolved) return null;
  const restaurant = restaurantId
    ? restaurants.find((item) => item._id.toString() === restaurantId.toString())
    : restaurants[0];
  if (!restaurant) return null;

  let restaurantMembership = null;
  if (!resolved.isSystemAdmin && resolved.membership?.role === 'STAFF') {
    restaurantMembership = await RestaurantMembership.findOne({
      restaurant: restaurant._id,
      user: user.id,
      status: 'ACTIVE',
    }).lean();
    const permissions = RESTAURANT_ROLE_PERMISSIONS[restaurantMembership?.role] || [];
    if (permission && !permissions.includes(permission)) return null;
  }

  return {
    restaurant,
    organization: resolved.organization,
    organizationMembership: resolved.membership,
    restaurantMembership,
  };
}

function requireOrganization(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const organizationId = req.params.organizationId || requestedId(req, 'x-organization-id', 'organizationId', 'organizationId');
      const resolved = await resolveOrganizationForUser(req.user, organizationId);
      if (!resolved) return res.status(403).json({ success: false, message: 'Organization access denied.' });
      if (allowedRoles.length && !resolved.isSystemAdmin && !allowedRoles.includes(resolved.membership.role)) {
        return res.status(403).json({ success: false, message: 'Your organization role cannot perform this action.' });
      }
      req.organization = resolved.organization;
      req.organizationMembership = resolved.membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function requireRestaurant(permission = null) {
  return async (req, res, next) => {
    try {
      const organizationId = requestedId(req, 'x-organization-id', 'organizationId', 'organizationId');
      const restaurantId = requestedId(req, 'x-restaurant-id', 'restaurantId', 'restaurantId') || req.params.restaurantId;
      const access = await resolveRestaurantAccess(req.user, { organizationId, restaurantId, permission });
      if (!access) return res.status(403).json({ success: false, message: 'Restaurant access denied.' });
      req.restaurant = access.restaurant;
      req.organization = access.organization;
      req.organizationMembership = access.organizationMembership;
      req.restaurantMembership = access.restaurantMembership;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  RESTAURANT_PERMISSIONS,
  RESTAURANT_ROLE_PERMISSIONS,
  listOrganizationMemberships,
  resolveOrganizationForUser,
  getAccessibleRestaurants,
  resolveRestaurantAccess,
  requireOrganization,
  requireRestaurant,
};
