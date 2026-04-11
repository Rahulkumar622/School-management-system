import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { getStudentSession } from "../session";
import { isPositiveNumber } from "../utils/validation";
import "../styles/appShell.css";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => String(value || "").slice(0, 10) || "Not available";
const sanitizeDecimal = (value) => {
  const normalized = String(value || "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("");
  return decimalParts.length ? `${integerPart}.${decimalPart.slice(0, 2)}` : integerPart;
};

function StudentCheckout() {
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state || getStudentSession();

  const [fee, setFee] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!student?.id) {
      setStatus({ type: "error", message: "Student session missing. Please login again." });
      return;
    }

    const loadCheckout = async () => {
      try {
        const { data } = await api.get(`/student-fee/${student.id}`);
        setFee(data.fee || null);
        setInstallments(data.installments || []);
        setPayments(data.payments || []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.response?.data?.message || "Unable to load checkout data.",
        });
      }
    };

    loadCheckout();
  }, [student?.id]);

  const handlePay = async () => {
    if (!isPositiveNumber(paymentAmount)) {
      setStatus({ type: "error", message: "Payment amount valid aur 0 se bada hona chahiye." });
      return;
    }

    try {
      const { data } = await api.post(`/students/${student.id}/pay-fee`, {
        amount: Number(paymentAmount),
        payment_method: "dummy-checkout",
        notes: "Dummy checkout page payment",
      });

      setFee({
        annual_fee: data.student.annual_fee,
        paid_fee: data.student.paid_fee,
        due_fee: data.student.due_fee,
        fee_status: data.student.fee_status,
      });
      setInstallments(data.installments || []);
      setPayments(data.payments || []);
      setPaymentAmount("");
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to complete payment.",
      });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2>Student Checkout</h2>
            <p>Complete a dummy fee payment and see which installments get cleared.</p>
          </div>

          <button className="secondary-button" onClick={() => navigate("/student-dashboard", { state: student })}>
            Back to Dashboard
          </button>
        </div>

        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

        <div className="card-grid">
          <div className="info-card">
            <h3>Fee Summary</h3>
            <div className="detail-list">
              <div className="detail-item">
                <span>Annual Fee</span>
                <strong>{formatCurrency(fee?.annual_fee)}</strong>
              </div>
              <div className="detail-item">
                <span>Paid Fee</span>
                <strong>{formatCurrency(fee?.paid_fee)}</strong>
              </div>
              <div className="detail-item">
                <span>Due Fee</span>
                <strong>{formatCurrency(fee?.due_fee)}</strong>
              </div>
              <div className="detail-item">
                <span>Status</span>
                <strong className="capitalize">{fee?.fee_status || "-"}</strong>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3>Pay Now</h3>
            <div className="field-group">
              <label htmlFor="checkout-amount">Amount</label>
              <input
                id="checkout-amount"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(sanitizeDecimal(event.target.value))}
              />
            </div>
            <div className="button-row">
              <button className="primary-button" onClick={handlePay}>
                Complete Dummy Payment
              </button>
            </div>
          </div>
        </div>

        <div className="info-card table-panel" style={{ marginTop: "22px" }}>
          <div className="table-panel-header">
            <h3>Installments</h3>
            <p className="section-caption">Scroll sideways on smaller screens to review the complete installment plan.</p>
          </div>
          {installments.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Installment</th>
                    <th>Due</th>
                    <th>Paid</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((installment) => (
                    <tr key={installment.id}>
                      <td>{installment.installment_label}</td>
                      <td>{formatCurrency(installment.amount_due)}</td>
                      <td>{formatCurrency(installment.amount_paid)}</td>
                      <td>{formatDate(installment.due_date)}</td>
                      <td className="capitalize">{installment.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">No installments available yet.</p>
            </div>
          )}
        </div>

        <div className="info-card table-panel" style={{ marginTop: "22px" }}>
          <div className="table-panel-header">
            <h3>Recent Payments</h3>
          </div>
          {payments.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.payment_method}</td>
                      <td>{payment.transaction_ref}</td>
                      <td>{formatDate(payment.paid_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">No payments found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentCheckout;
