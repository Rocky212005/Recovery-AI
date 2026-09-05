const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const { analyzePayment } = require("../services/recovery.service");

const createFailedPayment = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      amount,
      method,
      failureReason,
    } = req.body;

    let customer = await Customer.findOne({
      email: customerEmail,
    });

    if (!customer) {
      customer = await Customer.create({
        name: customerName,
        email: customerEmail,
        totalPayments: 0,
        successfulPayments: 0,
        failedPayments: 0,
        totalSpent: 0,
        customerSegment: "regular",
      });
    }

    customer.totalPayments += 1;
    customer.failedPayments += 1;

    if (customer.totalSpent > 50000) {
      customer.customerSegment = "high_value";
    } else if (customer.totalSpent > 10000) {
      customer.customerSegment = "regular";
    }

    await customer.save();

    const payment = await Payment.create({
      razorpayPaymentId:
        "pay_demo_" + Date.now(),

      customerId: customer._id,

      amount,

      currency: "INR",

      status: "failed",

      method,

      failureReason,
    });

    const recovery = await analyzePayment(
      payment,
      customer
    );

    res.status(201).json({
      success: true,
      payment,
      recovery,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ========================================
// GET ALL PAYMENTS
// ========================================

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("customerId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


module.exports = {
  createFailedPayment,
  getPayments,
};