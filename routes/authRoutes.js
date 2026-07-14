const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {jwtAuthMiddleware, generateToken} = require('./../controllers/authController');

const localAuthMiddleware = passport.authenticate('local' , {session: false});

//Signup logic to register a user
router.post("/signup", async (req, res) => {
  try {
    const { name, email, username, password, phone, role } = req.body;
    const newUser = new User({
      name,
      email,
      username,
      password, // Ideally hashed before this point
      phone,
      role // Defaults to 'customer' in your schema if not provided
    });
    const savedUser = await newUser.save();
    console.log("User is registered now proceed to login");

    const payload ={
        id : savedUser.id,
        username: savedUser.username,
        role: savedUser.role
    }
    

    const token  = generateToken(payload);
    console.log("Token is: " ,token);

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
      token: token,
      user: clientUserResponse
    });

  } catch (err) {
    console.error("Signup Error: ", err);
    
    // Send a structured error response
      return res.status(400).json({ 
      success: false,
      message: "Registration failed",
      error: err.message 
    });
  }
});

//passport to verify user details
/* 
ALTERNATIVE AUTHENTICATION APPROACH: SERVER SESSION STRATEGY
Currently using JWT (stateless, token-based auth).

If using SERVER SESSION STRATEGY instead:
- User logs in → Server creates a session and stores user info in memory/database
- Server sends back session ID (via cookie)
- Client automatically sends session ID with each request
- Server verifies session ID against stored sessions

Passport LocalStrategy example (commented out):
1. Finds user by username
2. Compares password (bcrypt)
3. On success: Server creates session, stores user data
4. Subsequent requests: Check session, req.user auto-populated

Pros of Server Session: Simpler for traditional web apps, sessions can be revoked instantly
Cons: Requires server memory, doesn't scale well, slower for APIs

JWT approach (current): Stateless, token expires, better for microservices and mobile apps
*/

/*
passport.use(new LocalStrategy(async(USERNAME,  password, done) => {

    try{
        console.log('Recieved credentials: ', USERNAME , password);
        const user = await User.findOne({username: USERNAME});
        if(!user)
            return done(null , false, { message: 'Incorrect username'});

        const isPasswordMatch = await user.comparePassword(password);
        if(isPasswordMatch){
            return done(null , user)
        }else{
            return done(null , false, { message : 'Incorrect password'});
        }

    }catch(err){
        return done(err);

    }


}))
*/

router.post('/login', async (req, res) => {
    try {
        // 1. Extract credentials
        const { username, password } = req.body;

        // 2. Find the user
        const foundUser = await User.findOne({ username: username });

        // 3. Dual verification check
        if (!foundUser || !(await foundUser.comparePassword(password))) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid username or password' 
            });
        }

        // 4. Generate the payload for Access Token
        const payload = {
            id: foundUser._id,
            username: foundUser.username,
            role: foundUser.role
        };
        const token = generateToken(payload);

        // 5. SANITIZE: Build a safe profile object to pass back
        const clientUserResponse = {
            id: foundUser._id,
            name: foundUser.name,     // Useful for rendering "Welcome back, [Name]!"
            username: foundUser.username,
            role: foundUser.role,     // Essential for the frontend to route them to the right dashboard
            phone: foundUser.phone
        };

        // 6. Return standard envelope response
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
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
module.exports = router;