const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const { getPublicAvailability } = require('../services/restaurantAvailabilityService');

const router = express.Router();
router.use(jwtAuthMiddleware);

const requireCustomer = (req, res, next) => req.user.role === 'customer'
  ? next()
  : res.status(403).json({ success: false, message: 'A customer account is required.' });

const normalizeAddress = (address) => ({
  type: ['Home', 'Work', 'Other'].includes(address?.type) ? address.type : 'Other',
  addressLine: String(address?.addressLine || '').trim().slice(0, 200),
  city: String(address?.city || '').trim().slice(0, 80),
});

const serializeOrder = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  items: order.items,
  subtotal: order.subtotal,
  deliveryFee: order.deliveryFee,
  taxes: order.taxes,
  totalPrice: order.totalPrice,
  paymentMethod: order.paymentMethod,
  status: order.status,
  deliveryAddress: order.deliveryAddress,
  deliveryAddressLabel: order.deliveryAddressLabel,
  deliveryInstructions: order.deliveryInstructions,
  restaurant: order.restaurant,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

router.get('/addresses', requireCustomer, async (req, res) => {
  const user = await User.findById(req.user.id).select('addresses').lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  return res.json({ success: true, addresses: user.addresses || [] });
});

router.put('/addresses', requireCustomer, async (req, res) => {
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses.map(normalizeAddress) : [];
  if (!addresses.length || addresses.length > 5 || addresses.some((item) => !item.addressLine || !item.city)) {
    return res.status(400).json({ success: false, message: 'Provide between 1 and 5 complete delivery addresses.' });
  }
  const user = await User.findByIdAndUpdate(req.user.id, { addresses }, { new: true, runValidators: true }).select('addresses');
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  return res.json({ success: true, addresses: user.addresses });
});

router.post('/orders', requireCustomer, async (req, res) => {
  try {
    const { restaurantId, deliveryAddress, deliveryInstructions = '', clientRequestId } = req.body;
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!mongoose.isValidObjectId(restaurantId) || !requestedItems.length) {
      return res.status(400).json({ success: false, message: 'Choose a restaurant and at least one menu item.' });
    }
    if (!clientRequestId || String(clientRequestId).length > 80) {
      return res.status(400).json({ success: false, message: 'A valid checkout request ID is required.' });
    }
    const existing = await Order.findOne({ user: req.user.id, clientRequestId }).populate('restaurant', 'name logoUrl address');
    if (existing) return res.json({ success: true, order: serializeOrder(existing), duplicate: true });

    const address = normalizeAddress(deliveryAddress);
    if (!address.addressLine || !address.city) {
      return res.status(400).json({ success: false, message: 'Choose a complete delivery address.' });
    }
    const restaurant = await Restaurant.findOne({ _id: restaurantId, lifecycleStatus: 'ACTIVE' });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    if (!getPublicAvailability(restaurant).isOpenNow) {
      return res.status(409).json({ success: false, message: 'This restaurant is not accepting orders right now.' });
    }

    const quantities = new Map();
    for (const requested of requestedItems) {
      const id = String(requested.menuItemId || '');
      const quantity = Number(requested.quantity);
      if (!mongoose.isValidObjectId(id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ success: false, message: 'Every item needs a quantity between 1 and 20.' });
      }
      quantities.set(id, (quantities.get(id) || 0) + quantity);
      if (quantities.get(id) > 20) return res.status(400).json({ success: false, message: 'The maximum quantity per item is 20.' });
    }
    const menuItems = await MenuItem.find({ _id: { $in: [...quantities.keys()] }, restaurant: restaurant._id, isAvailable: true });
    if (menuItems.length !== quantities.size) {
      return res.status(409).json({ success: false, message: 'One or more items are no longer available. Refresh the menu and try again.' });
    }
    const items = menuItems.map((item) => ({ menuItem: item._id, quantity: quantities.get(String(item._id)), priceAtPurchase: item.price }));
    const subtotal = Number(items.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0).toFixed(2));
    const deliveryFee = subtotal >= 499 ? 0 : 40;
    const taxes = Number((subtotal * 0.05).toFixed(2));
    const totalPrice = Number((subtotal + deliveryFee + taxes).toFixed(2));
    const order = await Order.create({
      orderNumber: `FD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      clientRequestId: String(clientRequestId),
      items,
      subtotal,
      deliveryFee,
      taxes,
      totalPrice,
      paymentMethod: 'COD',
      deliveryAddress: `${address.addressLine}, ${address.city}`,
      deliveryAddressLabel: address.type,
      deliveryInstructions: String(deliveryInstructions).trim().slice(0, 300),
      user: req.user.id,
      restaurant: restaurant._id,
    });
    await order.populate('restaurant', 'name logoUrl address');
    return res.status(201).json({ success: true, order: serializeOrder(order) });
  } catch (error) {
    if (error?.code === 11000 && req.body.clientRequestId) {
      const existing = await Order.findOne({ user: req.user.id, clientRequestId: req.body.clientRequestId }).populate('restaurant', 'name logoUrl address');
      if (existing) return res.json({ success: true, order: serializeOrder(existing), duplicate: true });
    }
    console.error('[POST /customer/orders]', error);
    return res.status(500).json({ success: false, message: 'Unable to place the order.' });
  }
});

router.get('/orders', requireCustomer, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).populate('restaurant', 'name logoUrl address').sort({ createdAt: -1 }).limit(50);
  return res.json({ success: true, orders: orders.map(serializeOrder) });
});

router.get('/orders/:orderId', requireCustomer, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(404).json({ success: false, message: 'Order not found.' });
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id })
    .populate('restaurant', 'name logoUrl address')
    .populate('items.menuItem', 'title type');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  return res.json({ success: true, order: serializeOrder(order) });
});

router.patch('/orders/:orderId/cancel', requireCustomer, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(404).json({ success: false, message: 'Order not found.' });
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  if (order.status !== 'Pending') return res.status(409).json({ success: false, message: 'This order can no longer be cancelled.' });
  order.status = 'Cancelled';
  await order.save();
  await order.populate('restaurant', 'name logoUrl address');
  return res.json({ success: true, order: serializeOrder(order) });
});

module.exports = router;
