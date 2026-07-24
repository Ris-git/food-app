require('dotenv').config();
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');

// Database connection
const db = require('./config/db');

// Middlewares & Routes
const { jwtAuthMiddleware } = require('./middlewares/authMiddleware');
const { globalLimiter } = require('./middlewares/rateLimiter');

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

// Apply Global Rate Limiting to all API routes
app.use('/auth',  authRoutes);
app.use('/user', globalLimiter, jwtAuthMiddleware, userRoutes); // Protected with JWT & Rate Limited

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running and listening on port ${PORT}`);
});