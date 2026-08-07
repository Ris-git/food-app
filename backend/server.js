require('dotenv').config();
// Polyfill crypto for MongoDB driver in Node.js >=23
if (typeof global.crypto === 'undefined') {
    const { webcrypto } = require('crypto');
    global.crypto = webcrypto;
}
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');

// Database connection
const db = require('./config/db');

// Middlewares & Routes
const { jwtAuthMiddleware } = require('./middlewares/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Body parsing & Cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root Health Check
app.get('/', (req, res) => {
    res.status(200).send('Welcome to my foodies!!');
});

app.use('/auth', authRoutes);
app.use('/user', jwtAuthMiddleware, userRoutes); // Protected with JWT

const menuRoutes = require('./routes/menuRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

app.use('/menu', menuRoutes);
app.use('/restaurant', restaurantRoutes);
app.use('/partner', partnerRoutes);
app.use('/admin', adminRoutes);
app.use('/media', mediaRoutes);




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running and listening on port ${PORT}`);
});
