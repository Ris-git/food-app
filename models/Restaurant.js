const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Restaurant name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Restaurant address is required"],
    },
    operationalStatus: {
      type: String,
      enum: ["OPEN", "CLOSED", "TEMPORARILY_UNAVAILABLE"],
      default: "OPEN",
    },
    // The vendor/owner who manages this restaurant
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Restaurant", restaurantSchema);