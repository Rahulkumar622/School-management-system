import React, { useEffect, useState } from "react";

import api from "../api";
import { getAdminSession } from "../session";
import "../styles/appShell.css";

function PaymentReports() {
  const adminSession = getAdminSession();
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const totalCollected = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const params =
          adminSession?.role === "school_admin" && adminSession.school_id
            ? { schoolId: adminSession.school_id }
            : {};
        const { data } = await api.get("/payments", { params });
        setPayments(data.payments || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to load payment reports."
        );
      }
    };

    fetchPayments();
  }, [adminSession?.role, adminSession?.school_id]);

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Payment Reports</span>
            <h2>Fee Payment Reports</h2>
            <p className="hero-lead">
              {adminSession?.role === "school_admin"
                ? "Review fee payments completed for your school."
                : "Review fee payments completed across all schools."}
            </p>
            <div className="hero-meta">
              <span className="meta-chip">{payments.length} payments</span>
              <span className="meta-chip">Collected Rs. {totalCollected.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="card-grid">
          <div className="info-card stat-card stat-card--tone-primary">
            <span className="card-eyebrow">Transactions</span>
            <h3>Total Payments</h3>
            <p className="metric">{payments.length}</p>
            <p className="metric-note">Completed payment records visible in this report.</p>
          </div>
          <div className="info-card stat-card stat-card--tone-accent">
            <span className="card-eyebrow">Collections</span>
            <h3>Collected Amount</h3>
            <p className="metric">Rs. {totalCollected.toFixed(2)}</p>
            <p className="metric-note">Total amount collected across the current filtered view.</p>
          </div>
        </div>

        <div className="info-card table-panel panel-top-gap">
          <div className="table-panel-header">
            <h3>Payment Ledger</h3>
            <p className="section-caption">Scroll sideways on smaller screens to inspect the full payment history.</p>
          </div>

          {payments.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.school_name || "-"}</td>
                      <td>{payment.student_name}</td>
                      <td>Rs. {Number(payment.amount).toFixed(2)}</td>
                      <td>{payment.payment_method}</td>
                      <td>{payment.transaction_ref}</td>
                      <td>{String(payment.paid_at).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">No payment records available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentReports;
