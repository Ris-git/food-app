const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const localAuthMiddleware = passport.authenticate('local' , {session: false});

//register logic to register a user
router.post("/register", async (req, res) => {
  try {
    const data = req.body;
    const newUser = new User(data);
    const savedUser = await newUser.save();
    console.log("User is registered now proceed to login");
    res.status(200).json(savedUser);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message, details: err.errors });
  }
});

//login logic to verify user details 
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

router.post("/login" ,localAuthMiddleware , (req, res)=> {
    res.send("You are verified , welcome to Foody!");
} );
module.exports = router;