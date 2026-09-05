const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: String,

    totalPayments: {
      type: Number,
      default: 0,
    },

    successfulPayments: {
      type: Number,
      default: 0,
    },

    failedPayments: {
      type: Number,
      default: 0,
    },

    totalSpent: {
      type: Number,
      default: 0,
    },

    customerSegment: {
      type: String,
      enum: ["low_value", "regular", "high_value"],
      default: "regular",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Customer", customerSchema);