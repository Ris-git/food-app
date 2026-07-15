const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to guard protected routes using the Access Token
const jwtAuthMiddleware = (req, res, next) => {
    // 1. Check if authorization header exists
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: 'Token Not Found' });

    // 2. Extract the jwt token from the 'Bearer <token>' string
    const token = authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // 3. Verify using the short-lived ACCESS token secret - FIXED
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // Attach user data payload ({ id, username, role }) to request object
        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT Middleware Error: ", err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Helper: Generate Short-lived Access Token (15 minutes) - FIXED
const generateAccessToken = (payload) => {
    return jwt.sign(
        { id: payload.id, username: payload.username, role: payload.role }, 
        process.env.ACCESS_TOKEN_SECRET, 
        { expiresIn: '15m' }
    );
};

// Helper: Generate Long-lived Refresh Token (7 days) - FIXED
const generateRefreshToken = (payload) => {
    // Minimize payload in refresh token to maximize security
    return jwt.sign(
        { id: payload.id }, 
        process.env.REFRESH_TOKEN_SECRET, 
        { expiresIn: '7d' }
    );
};

module.exports = { 
    jwtAuthMiddleware, 
    generateAccessToken, 
    generateRefreshToken 
};