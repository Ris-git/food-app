const express = require('express');
const app = express();
const db = require('./db');
const User = require('./models/user');
const bodyParser = require('body-parser');
const user = require('./models/user');
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.send('Welcome to my foodies!!' )
})

app.post('/user' , async (req,res) =>{
    

    try{
        const data = req.body;
        const newUser  = new user(data);
        const savedUser  = await newUser.save();
        console.log("data is saved for user");
        res.status(200).json(savedUser)
    }
    catch(err){
        console.log(err);
        res.status(400).json({error: err.message, details: err.errors})
    }

})
app.get('/user' , async (req, res) => {
    try{

        const data = await user.find();
        console.log('data fetched from foodDB');
        res.status(200).json(data);
    }catch(err){
        console.log(err);
        res.status(400).json({error: err.message, details: err.errors});
    }

})

    app.listen(3000, ()=>{
    console.log('listening on port 3000');
})