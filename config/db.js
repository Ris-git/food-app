const mongoose = require('mongoose');
const mongourl = 'mongodb://localhost:27017/FoodDB';

mongoose.connect(mongourl);

const db = mongoose.connection;



db.on('connected', () => {
    console.log('Connected to food app server!!');
    
});

db.on('error', (err) => {
    console.log('Error connecting to mongodb server', err);
});

db.on('disconnected', () => {
    console.log('Food sever Disconnected');
});

module.exports = db;

