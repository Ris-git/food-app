const mongoose = require("mongoose");

const orderItemSubSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  priceAtPurchase: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    clientRequestId: {
      type: String,
    },
    items: [orderItemSubSchema],
    totalPrice: {
      type: Number,
      required: true,
    },
    subtotal: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, required: true, default: 0 },
    taxes: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
    },
    status: {
      type: String,
      enum: ["Pending", "Preparing", "OutForDelivery", "Delivered", "Cancelled"],
      default: "Pending",
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryAddressLabel: { type: String, default: "Other" },
    deliveryInstructions: { type: String, trim: true, maxlength: 300, default: "" },
    // The customer placing the order
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The restaurant processing the order
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    // Assigned delivery driver (optional until assigned)
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

orderSchema.index({ restaurant: 1, createdAt: -1, status: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, clientRequestId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Order", orderSchema);
