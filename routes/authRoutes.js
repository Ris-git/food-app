const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');
const { permissions } = require('../config/roles');
const { 
  signupValidationRules, 
  loginValidationRules, 
  validate 
} = require("../middlewares/ValidateAuth");
const {
  generateAccessToken,
  generateRefreshToken,
  parseDuration,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
} = require('./../controllers/authController');

// Signup logic to register a user
router.post("/signup", signupValidationRules, validate, async (req, res) => {
  try {
    const { name, email, username, password, phone, role } = req.body;

    // CHANGE 2: Added a check for existing email/username before trying to save
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username or email is already registered"
      });
    }

    const newUser = new User({
      name,
      email,
      username,
      password, 
      phone,
      role 
    });
    
    //Simplified DB operations by passing initial refresh token directly 
    const payload = {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role
    };
    
    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + parseDuration(ACCESS_TOKEN_EXPIRES_IN)).toISOString();

    // Assign refresh token before saving so you only hit the database ONCE instead of twice
    newUser.refreshToken = refreshToken;
    const savedUser = await newUser.save();
    console.log("User is registered now proceed to login");

    // Set the refresh token cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseDuration(REFRESH_TOKEN_EXPIRES_IN)
    });

    const clientUserResponse = {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      username: savedUser.username,
      role: savedUser.role,
      phone: savedUser.phone
    };

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      accessToken: accessToken,
      expiresAt: expiresAt,
      user: clientUserResponse
    });

  } catch (err) {
    console.error("Signup Error: ", err);
    return res.status(500).json({ 
      success: false,
      message: "Registration failed",
      error: err.message 
    });
  }
});

// Login Route
router.post('/login', loginValidationRules, validate, async (req, res) => {
    try {
        const { username, password } = req.body;
        const foundUser = await User.findOne({ username: username });

        if (!foundUser || !(await foundUser.comparePassword(password))) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username or password' 
            });
        }

        const payload = {
            id: foundUser._id,
            username: foundUser.username,
            role: foundUser.role
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        foundUser.refreshToken = refreshToken;
        await foundUser.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: parseDuration(REFRESH_TOKEN_EXPIRES_IN)
        });

        const clientUserResponse = {
            id: foundUser._id,
            name: foundUser.name,     
            username: foundUser.username,
            role: foundUser.role,     
            phone: foundUser.phone
        };

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            accessToken: accessToken,
            user: clientUserResponse
        });

    } catch (err) {
        console.error("Login Route Error: ", err);
        return res.status(500).json({ 
            success: false,
            message: 'Internal Server Error' 
        });
    }
});


router.post('/refresh-token', async (req, res) => {
    try {
        const incomingRefreshToken = (req.cookies && req.cookies.refreshToken) || req.body?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({ 
                success: false, 
                error: 'Refresh token is missing. Please log in again.' 
            });
        }

        const foundUser = await User.findOne({ refreshToken: incomingRefreshToken });
        if (!foundUser) {
            return res.status(403).json({ success: false, error: 'Invalid refresh token' });
        }

        try {
            const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
            
            // Build fresh payload using data from verified DB record
            const payload = {
                id: foundUser._id,
                username: foundUser.username,
                role: foundUser.role
            };
            const newAccessToken = generateAccessToken(payload);

            // Clean industry standard format
            return res.status(200).json({ 
                success: true, 
                accessToken: newAccessToken 
            });

        } catch (jwtErr) {
            console.error("JWT Verify Internal Error: ", jwtErr.message);
            return res.status(403).json({ success: false, error: 'Expired or tampered refresh token' });
        }

    } catch (err) {
        console.error("Refresh Token Router Failure: ", err);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});



router.post('/logout', async (req, res) => {
    try {
        const token = (req.cookies && req.cookies.refreshToken) || req.body?.refreshToken;

        // Clear it from the database
        await User.findOneAndUpdate({ refreshToken: token }, { $set: { refreshToken: "" } });

        // Clear cookie from browser
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;