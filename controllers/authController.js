const jwt = require('jsonwebtoken');
require('dotenv').config();

// Helper: Generate Short-lived Access Token (15 minutes)
const generateAccessToken = (payload) => {
    return jwt.sign(
        { id: payload.id, username: payload.username, role: payload.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );
};

// Helper: Generate Long-lived Refresh Token (7 days)
const generateRefreshToken = (payload) => {
    return jwt.sign(
        { id: payload.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
};
