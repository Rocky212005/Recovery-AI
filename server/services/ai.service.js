const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-3.5-flash",
});

const analyzeWithAI = async ({
  payment,
  customer,
}) => {
  const prompt = `
You are RecoverAI, an AI revenue recovery agent.

Analyze the failed payment and recommend the safest recovery strategy.

CUSTOMER:
Name: ${customer.name}
Total payments: ${customer.totalPayments}
Successful payments: ${customer.successfulPayments}
Failed payments: ${customer.failedPayments}
Total spent: ₹${customer.totalSpent}
Customer segment: ${customer.customerSegment}

PAYMENT:
Amount: ₹${payment.amount}
Method: ${payment.method}
Failure reason: ${payment.failureReason}
Failure code: ${payment.failureCode || "unknown"}

Allowed decisions:
retry
payment_link
human_escalation
do_nothing

IMPORTANT:
- If insufficient_funds, do NOT recommend retrying the same payment method.
- Prefer payment_link when the customer can use another payment method.
- Use human_escalation for suspicious or genuinely high-risk situations.
- Keep the probability realistic based on the customer's payment history.
- The decision and reason MUST agree with each other.

Return ONLY valid JSON:

{
  "riskLevel": "low",
  "recoveryProbability": 0.0,
  "decision": "payment_link",
  "urgency": "medium",
  "reason": "short explanation",
  "customerMessage": "short customer-facing message"
}
`;

  const result =
    await model.generateContent(prompt);

  const text =
    result.response.text();

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
};

module.exports = {
  analyzeWithAI,
};