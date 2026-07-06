const mongoose = require('mongoose');
const mongourl = 'mongodb://localhost:27017/FoodDB';

mongoose.connect(mongourl);

const db = mongoose.connection;

const insertTestDocument = async () => {
    try {
        const testCollection = db.db.collection('test');
        const result = await testCollection.insertOne({
            message: 'FoodDB test insert',
            createdAt: new Date()
        });
        console.log('Inserted test document into FoodDB:', result.insertedId);
    } catch (err) {
        console.log('Error inserting test document', err);
    }
};

db.on('connected', () => {
    console.log('Connected to food app server!!');
    insertTestDocument();
});

db.on('error', (err) => {
    console.log('Error connecting to mongodb server', err);
});

db.on('disconnected', () => {
    console.log('Food sever Disconnected');
});

module.exports = db;

