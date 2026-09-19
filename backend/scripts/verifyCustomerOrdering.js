const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

process.env.ACCESS_TOKEN_SECRET ||= 'foody-customer-flow-test-secret';

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const customerRoutes = require('../routes/customerRoutes');

const uri = process.env.CUSTOMER_FLOW_TEST_URI || 'mongodb://127.0.0.1:27017/FoodyCustomerFlowTest';
if (!/FoodyCustomerFlowTest(?:\?|$)/.test(uri)) throw new Error('CUSTOMER_FLOW_TEST_URI must use the FoodyCustomerFlowTest database.');

const request = async (baseUrl, token, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...options.headers },
  });
  return { status: response.status, body: await response.json() };
};

async function run() {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();

  const [customer, stranger, owner] = await User.create([
    { name: 'Customer Test', email: 'customer-flow@foody.test', username: 'customer_flow', password: 'Password!123', phone: '9000000001', role: 'customer', emailVerified: true },
    { name: 'Stranger Test', email: 'stranger-flow@foody.test', username: 'stranger_flow', password: 'Password!123', phone: '9000000002', role: 'customer', emailVerified: true },
    { name: 'Owner Test', email: 'owner-flow@foody.test', username: 'owner_flow', password: 'Password!123', phone: '9000000003', role: 'restaurant', emailVerified: true },
  ]);
  const allDay = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, { isOpen: true, openTime: '00:00', closeTime: '00:00' }]));
  const restaurant = await Restaurant.create({ name: 'Ordering Test Kitchen', address: '1 Test Street', user: owner._id, operatingHours: allDay, operationalStatus: 'OPEN' });
  const [available, unavailable] = await MenuItem.create([
    { title: 'Test Bowl', type: 'veg', price: 200, restaurant: restaurant._id, isAvailable: true },
    { title: 'Unavailable Bowl', type: 'veg', price: 500, restaurant: restaurant._id, isAvailable: false },
  ]);

  const app = express();
  app.use(express.json());
  app.use('/customer', customerRoutes);
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ id: customer._id.toString(), role: 'customer' }, process.env.ACCESS_TOKEN_SECRET);
  const strangerToken = jwt.sign({ id: stranger._id.toString(), role: 'customer' }, process.env.ACCESS_TOKEN_SECRET);

  try {
    const payload = {
      restaurantId: restaurant._id,
      items: [{ menuItemId: available._id, quantity: 2, price: 1 }],
      deliveryAddress: { type: 'Home', addressLine: '22 Customer Lane', city: 'Bengaluru' },
      deliveryInstructions: 'Ring the bell',
      clientRequestId: 'customer-flow-idempotency-key',
    };
    const created = await request(baseUrl, token, '/customer/orders', { method: 'POST', body: JSON.stringify(payload) });
    if (created.status !== 201 || created.body.order.subtotal !== 400 || created.body.order.totalPrice !== 460) throw new Error(`Server pricing failed: ${JSON.stringify(created.body)}`);

    const repeated = await request(baseUrl, token, '/customer/orders', { method: 'POST', body: JSON.stringify(payload) });
    if (repeated.status !== 200 || !repeated.body.duplicate || repeated.body.order.id !== created.body.order.id) throw new Error('Idempotent checkout failed.');

    const unavailableResponse = await request(baseUrl, token, '/customer/orders', { method: 'POST', body: JSON.stringify({ ...payload, items: [{ menuItemId: unavailable._id, quantity: 1 }], clientRequestId: 'unavailable-item' }) });
    if (unavailableResponse.status !== 409) throw new Error('Unavailable menu item was accepted.');

    const privateResponse = await request(baseUrl, strangerToken, `/customer/orders/${created.body.order.id}`);
    if (privateResponse.status !== 404) throw new Error('A customer accessed another customer’s order.');

    const cancelled = await request(baseUrl, token, `/customer/orders/${created.body.order.id}/cancel`, { method: 'PATCH' });
    if (cancelled.status !== 200 || cancelled.body.order.status !== 'Cancelled') throw new Error('Pending order cancellation failed.');
    if (await Order.countDocuments() !== 1) throw new Error('Duplicate checkout created more than one order.');

    console.log('Customer ordering verification passed: pricing, availability, idempotency, privacy and cancellation.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error(error);
  try { await mongoose.disconnect(); } catch {}
  process.exitCode = 1;
});
