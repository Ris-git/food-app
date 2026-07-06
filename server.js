const express = require('express');
const app = express();
const db = require('./db');

app.get('/', function (req, res) {
    res.send('Welcome to my foodies!!' )
})

app.get('/chicken', (req, res)=>{
    res.send('sure sir, i would love to serve chicken')
})
app.get('/login', (req, res)=>{
    var user_details = {
    name: 'rishabh',
    email: 'rishabhvis15@gmail.com' ,
    address:  'sidhi',
    id: 123444,
    }
    res.json(user_details);
})
    app.listen(3000, ()=>{
    console.log('listening on port 3000');
})