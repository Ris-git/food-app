const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

const parseDuration = (durationString) => {
    if (!durationString || typeof durationString !== 'string') {
        return 0;
    }

    const normalized = durationString.trim().toLowerCase();
    const match = normalized.match(/^(\d+)([smhd])$/);
    if (!match) {
        return 0;
    }

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            return 0;
    }
};

// Helper: Generate Short-lived Access Token
const generateAccessToken = (payload) => {
    return jwt.sign(
        { id: payload.id, username: payload.username, role: payload.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
};

// Helper: Generate Long-lived Refresh Token
const generateRefreshToken = (payload) => {
    return jwt.sign(
        { id: payload.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    parseDuration,
    ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_IN
};
