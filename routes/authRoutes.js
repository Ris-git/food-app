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
    const data = req.body;
    const newUser = new User(data);
    const savedUser = await newUser.save();
    console.log("User is registered now proceed to login");

    const payload ={
        id : savedUser.id,
        username: savedUser.username,
        role: savedUser.role
    }
    console.log(JSON.stringify(payload));

    const token  = generateToken(payload);
    console.log("Token is: " ,token);



    res.status(200).json({savedUser: savedUser , token: token});
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message, details: err.errors });
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

router.post('/login', async(req, res) => {
    try{
        // Extract username and password from request body
        const {username, password} = req.body;

        // Find the user by username
        const foundUser = await User.findOne({username: username});

        // If user does not exist or password does not match, return error
        if( !foundUser || !(await foundUser.comparePassword(password))){
            return res.status(401).json({error: 'Invalid username or password'});
        }

        // generate Token 
        const payload = {
            id: foundUser.id,
            username: foundUser.username,
            role: foundUser.role
        }
        const token = generateToken(payload);

        // return token as response
        res.json({token})
    }catch(err){
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
module.exports = router;