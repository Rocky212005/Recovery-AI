import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000";

function App() {
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);

  const fetchPayments = async () => {
    try {
      const res = await axios.get(`${API}/api/payments`);
      setPayments(res.data.payments || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

const simulateFailure = async () => {
  setLoading(true);

  try {
    const res = await axios.post(
      `${API}/api/payments/simulate-failure`,
      {
        customerName: "Hackathon Demo",
        customerEmail: `demo${Date.now()}@example.com`,
        amount: 7999,
        method: "card",
        failureReason: "insufficient_funds",
      }
    );

    console.log("FULL API RESPONSE:", res.data);

    // Backend returns paymentLink as an object
    if (res.data.paymentLink?.shortUrl) {
      setPaymentLink(res.data.paymentLink.shortUrl);
    } else {
      console.log("No payment link returned");
    }

    await fetchPayments();

  } catch (error) {
    console.error(
      "Simulation error:",
      error.response?.data || error
    );

    alert("Failed to simulate payment");
  }

  setLoading(false);
};

  const totalFailed = payments
    .filter((p) => p.status === "failed")
    .reduce((sum, p) => sum + p.amount, 0);

  const recovered = payments
    .filter((p) => p.status === "recovered")
    .reduce((sum, p) => sum + p.amount, 0);

  const recoveryRate =
    totalFailed + recovered > 0
      ? Math.round(
          (recovered / (totalFailed + recovered)) * 100
        )
      : 0;

  const getDecision = (payment) => {
    if (payment.status === "recovered") {
      return {
        label: "Recovered",
        className: "decision-success",
      };
    }

    if (payment.failureReason === "insufficient_funds") {
      return {
        label: "Payment Link",
        className: "decision-link",
      };
    }

    return {
      label: "AI Analysis",
      className: "decision-review",
    };
  };

  return (
    <div className="app">

      {/* HEADER */}

      <header>
        <div>
          <div className="brand">
            <div className="logo">R</div>

            <div>
              <h1>RecoverAI</h1>
              <p>
                Autonomous Payment Recovery Agent
              </p>
            </div>
          </div>
        </div>

        <button
          className="simulate-btn"
          onClick={simulateFailure}
          disabled={loading}
        >
          {loading
            ? "🤖 AI Analyzing..."
            : "+ Simulate Failed Payment"}
        </button>
      </header>
  
  {paymentLink && (
  <div className="payment-link-box">

    <div>
      <h3>🤖 RecoverAI Recovery Action</h3>

      <p>
        AI detected a failed payment and generated
        a Razorpay payment link.
      </p>
    </div>

    <a
      href={paymentLink}
      target="_blank"
      rel="noopener noreferrer"
      className="payment-link-btn"
    >
      Open Razorpay Payment →
    </a>

  </div>
)}

      {/* STATS */}

      <section className="stats">

        <div className="card">
          <span>Failed Revenue</span>
          <h2>
            ₹{totalFailed.toLocaleString()}
          </h2>
          <small>Needs recovery</small>
        </div>

        <div className="card">
          <span>Recovered Revenue</span>
          <h2>
            ₹{recovered.toLocaleString()}
          </h2>
          <small>Successfully recovered</small>
        </div>

        <div className="card">
          <span>Recovery Rate</span>
          <h2>{recoveryRate}%</h2>
          <small>AI recovery performance</small>
        </div>

        <div className="card">
          <span>Total Payments</span>
          <h2>{payments.length}</h2>
          <small>Tracked transactions</small>
        </div>

      </section>


      {/* MAIN */}

      <section className="panel">

        <div className="panel-header">

          <div>
            <h2>Payment Recovery Activity</h2>
            <p>
              AI-powered analysis of failed payments
            </p>
          </div>

          <button
            className="refresh-btn"
            onClick={fetchPayments}
          >
            ↻ Refresh
          </button>

        </div>


        {/* TABLE */}

        <div className="table">

          <div className="row header">

            <span>Payment</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Method</span>
            <span>AI Decision</span>

          </div>


          {payments.map((payment) => {

            const decision =
              getDecision(payment);

            return (

              <div
                className="row payment-row"
                key={payment._id}
                onClick={() =>
                  setSelectedPayment(payment)
                }
              >

                <span>
                  <strong>
                    {payment.razorpayPaymentId}
                  </strong>

                  <small>
                    {payment.customerId?.name ||
                      "Unknown Customer"}
                  </small>
                </span>


                <span>
                  ₹{payment.amount.toLocaleString()}
                </span>


                <span
                  className={
                    payment.status === "recovered"
                      ? "success"
                      : "failed"
                  }
                >
                  {payment.status === "recovered"
                    ? "✓ Recovered"
                    : "● Failed"}
                </span>


                <span className="method">
                  {payment.method}
                </span>


                <span>
                  <b
                    className={
                      decision.className
                    }
                  >
                    {decision.label}
                  </b>
                </span>

              </div>

            );
          })}


          {payments.length === 0 && (

            <div className="empty">

              <div className="empty-icon">
                🤖
              </div>

              <h3>
                No failed payments
              </h3>

              <p>
                Click "Simulate Failed Payment"
                to activate RecoverAI.
              </p>

            </div>

          )}

        </div>

      </section>


      {/* AI PANEL */}

      {selectedPayment && (

        <div className="ai-panel">

          <div className="ai-header">

            <div>
              <h2>
                🤖 RecoverAI Analysis
              </h2>

              <p>
                Autonomous recovery recommendation
              </p>
            </div>

            <button
              className="close-btn"
              onClick={() =>
                setSelectedPayment(null)
              }
            >
              ×
            </button>

          </div>


          <div className="ai-grid">

            <div className="ai-info">

              <span>Customer</span>

              <strong>
                {selectedPayment.customerId?.name ||
                  "Unknown"}
              </strong>

            </div>


            <div className="ai-info">

              <span>Failed Amount</span>

              <strong>
                ₹
                {selectedPayment.amount.toLocaleString()}
              </strong>

            </div>


            <div className="ai-info">

              <span>Failure Reason</span>

              <strong>
                {selectedPayment.failureReason}
              </strong>

            </div>


            <div className="ai-info">

              <span>Payment Method</span>

              <strong>
                {selectedPayment.method}
              </strong>

            </div>

          </div>


          <div className="recommendation">

            <div className="robot">
              🤖
            </div>

            <div>

              <span>
                AI RECOMMENDATION
              </span>

              <h3>
                {selectedPayment.failureReason ===
                "insufficient_funds"
                  ? "Generate Payment Link"
                  : "Analyze Customer"}
              </h3>

              <p>
                The payment failed because of{" "}
                <strong>
                  {selectedPayment.failureReason}
                </strong>
                . RecoverAI can recommend an
                alternative payment method instead
                of repeatedly retrying the same card.
              </p>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;