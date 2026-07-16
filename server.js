const express = require('express');
const app = express();
const db = require('./config/db');
const bodyParser = require('body-parser');
const User = require('./models/User');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { jwtAuthMiddleware } = require('./middlewares/authMiddleware');
require('dotenv').config();
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(bodyParser.json());

app.use(passport.initialize());


app.get('/', function (req, res) {
    res.send('Welcome to my foodies!!' )
})

const authRoutes = require('./routes/authRoutes');
app.use('/auth' , authRoutes);

const userRoutes = require('./routes/userRoutes');

app.use('/user', jwtAuthMiddleware, userRoutes);// Protected


app.listen(3000, ()=>{
  console.log('listening on port 3000');
   })