const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    razorpayPaymentId: {
      type: String,
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["created", "authorized", "captured", "failed"],
      default: "created",
    },

    method: String,

    failureReason: String,

    failureCode: String,

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);