const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'restaurant', 'driver'], 
    default: 'customer' 
  },
  addresses: [{
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    addressLine: String,
    city: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);