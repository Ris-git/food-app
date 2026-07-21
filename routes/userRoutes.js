const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authorize = require('../middlewares/roleMiddleware');
const { jwtAuthMiddleware } = require('../middlewares/authMiddleware');
const { permissions } = require('../config/roles');




//Peerfroming  CRUD operatings in Database


// //POST route to add a user
// router.post("/",jwtAuthMiddleware ,authorize(permissions.VIEW_USERS), async (req, res) => {
//   try {
//     const data = req.body;
//     const newUser = new User(data);
//     const savedUser = await newUser.save();
//     console.log("data is saved for user");
//     res.status(200).json(savedUser);
//   } catch (err) {
//     console.log(err);
//     res.status(400).json({ error: err.message, details: err.errors });
//   }
// });

//GET route to get all user details

// Passing an array of permissions into authorize()
router.get(
  "/", 
  jwtAuthMiddleware, 
  authorize([permissions.VIEW_USERS, permissions.ADMIN_ALL]), 
  async (req, res) => {
    try {
      // Exclude sensitive field 'password' from being returned in the response
      const data = await User.find().select("-password");
      console.log("Data fetched from foodDB");
      
      return res.status(200).json({
        success: true,
        count: data.length,
        users: data
      });
    } catch (err) {
      console.error("Error fetching users: ", err);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch users", 
        details: err.message 
      });
    }
  }
);

//GET route to get user details from user Type
router.get("/:userType", async (req, res) => {
  try {
    const userType = req.params.userType;
    if (
      userType == "customer" ||
      userType == "restaurant" ||
      userType == "driver" ||
      userType == "admin"
    ) {
      const response = await User.find({ role: userType });
      console.log("response fetched for user type:", userType);
      res.status(200).json(response);
    } else {
      res.status(404).json({ error: "Invalid user type" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: err.message, details: err.errors });
  }
});

//PUT route to update a record by id
router.put("/:id", async (req, res) => {
  try {
    const UserId = req.params.id;
    const updatedUserData = req.body;
    const updatedUser = await User.findByIdAndUpdate(UserId, updatedUserData, {
      new: true, // Return the updated document
      runValidators: true, // Run Mongoose validation
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//DELETE route to delete a record by id

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "user deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
});

module.exports = router;
