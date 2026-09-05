const crypto = require("crypto");

const Payment = require("../models/Payment");
const Customer = require("../models/Customer");
const Recovery = require("../models/Recovery");
const WebhookEvent = require("../models/WebhookEvent");

const { analyzePayment } = require("../services/recovery.service");
const {
  createPaymentLink,
} = require("../services/razorpay.service");

const verifySignature = (body, signature) => {
  const expectedSignature = crypto
    .createHmac(
      "sha256",
      process.env.RAZORPAY_WEBHOOK_SECRET
    )
    .update(body)
    .digest("hex");

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    received
  );
};

const razorpayWebhook = async (req, res) => {
  try {
    const signature =
      req.headers["x-razorpay-signature"];

    const eventId =
      req.headers["x-razorpay-event-id"];

    if (!signature || !eventId) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay webhook headers",
      });
    }

    const isValid = verifySignature(
      req.body,
      signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const payload = JSON.parse(req.body);

    console.log("Razorpay event:", payload.event);

    // -----------------------------------------
    // DUPLICATE EVENT PROTECTION
    // -----------------------------------------

    const existingEvent =
      await WebhookEvent.findOne({
        eventId,
      });

    if (existingEvent) {
      return res.status(200).json({
        success: true,
        message: "Webhook already processed",
      });
    }

    await WebhookEvent.create({
      eventId,
      event: payload.event,
    });

    // =========================================
    // PAYMENT CAPTURED
    // =========================================

    if (payload.event === "payment.captured") {
      const paymentEntity =
        payload.payload.payment.entity;

      const razorpayPaymentId =
        paymentEntity.id;

      const amount =
        paymentEntity.amount / 100;

      console.log(
        "Captured payment:",
        razorpayPaymentId
      );

      /*
       * Try to identify the Recovery using
       * the payment link ID / notes.
       */

      const paymentLinkId =
        paymentEntity.notes?.payment_link_id ||
        paymentEntity.notes?.paymentLinkId;

      let recovery = null;

      if (paymentLinkId) {
        recovery = await Recovery.findOne({
          paymentLinkId,
        });
      }

      /*
       * Fallback: find the most recent executed
       * recovery for the same customer/email.
       */

      if (!recovery) {
        const email =
          paymentEntity.email;

        if (email) {
          const customer =
            await Customer.findOne({ email });

          if (customer) {
            recovery =
              await Recovery.findOne({
                customerId: customer._id,
                status: "executed",
                aiDecision: "payment_link",
              }).sort({
                createdAt: -1,
              });
          }
        }
      }

      if (!recovery) {
        console.log(
          "No matching recovery found for captured payment"
        );

        return res.status(200).json({
          success: true,
          message:
            "Payment captured but no recovery found",
        });
      }

      // -----------------------------------------
      // FIND ORIGINAL PAYMENT
      // -----------------------------------------

      const payment =
        await Payment.findById(
          recovery.paymentId
        );

      if (!payment) {
        return res.status(200).json({
          success: true,
          message:
            "Recovery found but original payment not found",
        });
      }

      // -----------------------------------------
      // PREVENT DOUBLE RECOVERY
      // -----------------------------------------

      if (recovery.status === "recovered") {
        return res.status(200).json({
          success: true,
          message:
            "Payment already marked as recovered",
        });
      }

      // -----------------------------------------
      // UPDATE PAYMENT
      // -----------------------------------------

      payment.status = "recovered";

      await payment.save();

      // -----------------------------------------
      // UPDATE RECOVERY
      // -----------------------------------------

      recovery.status = "recovered";

      recovery.recommendedAction =
        "Payment successfully recovered";

      await recovery.save();

      // -----------------------------------------
      // UPDATE CUSTOMER
      // -----------------------------------------

      const customer =
        await Customer.findById(
          payment.customerId
        );

      if (customer) {
        customer.successfulPayments += 1;

        customer.totalSpent += amount;

        await customer.save();
      }

      console.log(
        "💰 PAYMENT RECOVERED:",
        amount
      );

      return res.status(200).json({
        success: true,

        message:
          "Payment successfully recovered",

        payment,

        recovery,
      });
    }

    // =========================================
    // PAYMENT FAILED
    // =========================================

    if (payload.event === "payment.failed") {
      const paymentEntity =
        payload.payload.payment.entity;

      const razorpayPaymentId =
        paymentEntity.id;

      const amount =
        paymentEntity.amount / 100;

      const method =
        paymentEntity.method;

      const errorDescription =
        paymentEntity.error_description ||
        "unknown";

      const email =
        paymentEntity.email ||
        `customer_${razorpayPaymentId}@demo.com`;

      const name =
        paymentEntity.notes?.customer_name ||
        "Demo Customer";

      // -----------------------------------------
      // FIND / CREATE CUSTOMER
      // -----------------------------------------

      let customer =
        await Customer.findOne({
          email,
        });

      if (!customer) {
        customer =
          await Customer.create({
            name,
            email,

            totalPayments: 1,

            successfulPayments: 0,

            failedPayments: 1,

            totalSpent: 0,

            customerSegment: "regular",
          });
      } else {
        customer.totalPayments += 1;

        customer.failedPayments += 1;

        await customer.save();
      }

      // -----------------------------------------
      // STORE PAYMENT
      // -----------------------------------------

      const payment =
        await Payment.create({
          razorpayPaymentId,

          customerId:
            customer._id,

          amount,

          currency:
            paymentEntity.currency,

          status: "failed",

          method,

          failureReason:
            errorDescription,

          failureCode:
            paymentEntity.error_code,
        });

      // -----------------------------------------
      // AI ANALYSIS
      // -----------------------------------------

      const recovery =
        await analyzePayment(
          payment,
          customer
        );

      // -----------------------------------------
      // PAYMENT LINK
      // -----------------------------------------

      if (
        recovery.aiDecision ===
        "payment_link"
      ) {
        const paymentLink =
          await createPaymentLink({
            amount,

            customer,

            paymentId:
              razorpayPaymentId,
          });

        recovery.paymentLinkId =
          paymentLink.id;

        recovery.status =
          "executed";

        recovery.recommendedAction =
          `Payment link created: ${paymentLink.short_url}`;

        await recovery.save();

        console.log(
          "Payment link created:",
          paymentLink.id
        );

        return res.status(200).json({
          success: true,

          message:
            "Payment failed and recovery link created",

          recovery,

          paymentLink:
            paymentLink.short_url,
        });
      }

      // -----------------------------------------
      // OTHER AI DECISIONS
      // -----------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Payment analyzed by RecoverAI",

        payment,

        recovery,
      });
    }

    // =========================================
    // OTHER EVENTS
    // =========================================

    return res.status(200).json({
      success: true,

      message:
        `Event ${payload.event} ignored`,
    });

  } catch (error) {
    console.error(
      "Webhook error:",
      error
    );

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

module.exports = {
  razorpayWebhook,
};