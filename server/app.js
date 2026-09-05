const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const paymentRoutes = require("./routes/payment.routes");
const webhookRoutes = require("./routes/webhook.routes");

const app = express();

app.use(helmet());
app.use(cors());

app.use(morgan("dev"));

// IMPORTANT:
// Webhook must come before express.json()
app.use(
  "/api/webhooks",
  webhookRoutes
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "RecoverAI API is running 🚀",
  });
});

app.use(
  "/api/payments",
  paymentRoutes
);

module.exports = app;