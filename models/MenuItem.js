const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Menu item title is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["veg", "non-veg", "beverage", "dessert", "other"],
      default: "other",
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MenuItem", menuItemSchema);