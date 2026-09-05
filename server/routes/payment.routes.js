const express = require("express");

const {
  createFailedPayment,
  getPayments,
} = require("../controllers/payment.controller");

const router = express.Router();

router.post(
  "/simulate-failure",
  createFailedPayment
);

router.get(
  "/",
  getPayments
);

module.exports = router;