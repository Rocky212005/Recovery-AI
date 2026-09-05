const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createPaymentLink = async ({
  amount,
  customer,
  paymentId,
}) => {
  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",

    accept_partial: false,

    reference_id: `REC-${paymentId}`,

    description: "RecoverAI payment recovery",

    customer: {
      name: customer.name,
      email: customer.email,
      contact: customer.phone || undefined,
    },

    reminder_enable: true,

    notes: {
      source: "RecoverAI",
      original_payment: paymentId,
    },
  };

  const paymentLink =
    await razorpay.paymentLink.create(options);

  return paymentLink;
};

module.exports = {
  razorpay,
  createPaymentLink,
};