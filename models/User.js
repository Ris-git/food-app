const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  username: {type: String , required: true , unique: true},
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'admin' ,'restaurant', 'driver'], 
    default: 'customer' 
  },
  
  refreshToken: {
      type: String,
      default: ""
  }, 
  addresses: [{
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    addressLine: String,
    city: String
  }]
},
{ timestamps: true });


UserSchema.pre('save', async function(){
    const user = this;

    // Hash the password only if it has been modified (or is new)
    if(!user.isModified('password')) return;

    // hash password generation
    const salt = await bcrypt.genSalt(10);

    // hash password
    const hashedPassword = await bcrypt.hash(user.password, salt);

    // Override the plain password with the hashed one
    user.password = hashedPassword;
})

UserSchema.methods.comparePassword = async function(candidatePassword){
    try{
        // Use bcrypt to compare the provided password with the hashed password
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    }catch(err){
        throw err;
    }
}


module.exports = mongoose.model('User', UserSchema);


//add persmissons models