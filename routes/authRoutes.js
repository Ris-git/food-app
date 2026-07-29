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
const { authLimiter } = require("../middlewares/rateLimiter");

const crypto = require('crypto');

const { sendVerificationEmail } = require("../services/email.service");

// Signup logic to register a user
router.post("/signup", authLimiter , signupValidationRules, validate, async (req, res) => {
  try {
    const { name, email, username, password, phone } = req.body;

    // Check if the email or username is already registered
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [DEV MODE] Overwriting existing user '${email}' / '${username}' for testing...`);
        await User.deleteOne({ _id: existingUser._id });
      } else {
        return res.status(400).json({
          success: false,
          message: "Username or email is already registered"
        });
      }
    }

    // Generate secure random verification token and 24-hour expiry
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = new User({
      name,
      email,
      username,
      password, 
      phone,
      emailVerified: false,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });
    
    await newUser.save();
    console.log("User registered with verification token. Sending verification email...");

    // Attempt to send verification email
    try {
      await sendVerificationEmail(newUser.email, verificationToken);
    } catch (emailErr) {
      console.error("⚠️ Failed to send verification email:", emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Account created. Verification pending."
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

// Email Verification Endpoint
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required"
      });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification token has expired. Please request a new one."
      });
    }

    // Update verification status and clear verification token
    user.emailVerified = true;
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in."
    });

  } catch (err) {
    console.error("Verify Email Error: ", err);
    return res.status(500).json({
      success: false,
      message: "Server error during email verification"
    });
  }
});

// Login Route
router.post('/login', authLimiter , loginValidationRules, validate, async (req, res) => {
    try {
        const { username, password } = req.body;
        const foundUser = await User.findOne({ username: username });

        if (!foundUser || !(await foundUser.comparePassword(password))) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username or password' 
            });
        }

        // Block unverified users from logging in (superAdmin is exempt)
        if (foundUser.role !== 'superAdmin' && !foundUser.emailVerified && !foundUser.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Email not verified. Please check your inbox and verify your email address before logging in."
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


router.post('/refresh-token', authLimiter , async (req, res) => {
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