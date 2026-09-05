const Recovery = require("../models/Recovery");
const {
  analyzeWithAI,
} = require("./ai.service");

const analyzePayment = async (
  payment,
  customer
) => {
  try {
    const aiResult =
      await analyzeWithAI({
        payment,
        customer,
      });

    // Safety layer
    const allowedDecisions = [
      "retry",
      "payment_link",
      "human_escalation",
      "do_nothing",
    ];

    let decision =
      aiResult.decision;

    if (
      !allowedDecisions.includes(decision)
    ) {
      decision = "human_escalation";
    }

    let probability = Number(
      aiResult.recoveryProbability
    );

    if (
      Number.isNaN(probability) ||
      probability < 0 ||
      probability > 1
    ) {
      probability = 0;
    }

    // High-risk payments should never be
    // automatically executed.
    if (
      aiResult.riskLevel === "high"
    ) {
      decision = "human_escalation";
    }

    const recovery =
      await Recovery.create({
        paymentId: payment._id,

        customerId: customer._id,

        recoveryProbability:
          probability,

        aiDecision: decision,

        recommendedAction:
          decision === "retry"
            ? "Retry payment"
            : decision ===
              "payment_link"
            ? "Generate payment link"
            : decision ===
              "human_escalation"
            ? "Escalate to human"
            : "No action",

        aiReason:
          aiResult.reason,

        status: "pending",

        attempts: 0,
      });

    return recovery;

  } catch (error) {
    console.error(
      "AI Agent Error:",
      error.message
    );

    // Safe fallback
    const recovery =
      await Recovery.create({
        paymentId: payment._id,

        customerId: customer._id,

        recoveryProbability: 0,

        aiDecision:
          "human_escalation",

        recommendedAction:
          "Escalate to human",

        aiReason:
          "AI analysis unavailable. Manual review required.",

        status: "pending",

        attempts: 0,
      });

    return recovery;
  }
};

module.exports = {
  analyzePayment,
};