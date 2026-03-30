import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bar, Pie } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import api from "./api";
import { clearStudentSession, getStudentSession } from "./session";
import "./styles/appShell.css";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => String(value || "").slice(0, 10) || "Not available";

const getStatusTone = (value) => {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "paid" || normalized === "present" || normalized === "active") {
    return "success";
  }

  if (normalized === "partial" || normalized === "pending") {
    return "warning";
  }

  if (normalized === "unpaid" || normalized === "absent" || normalized === "inactive") {
    return "danger";
  }

  return "neutral";
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state || getStudentSession();

  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fee, setFee] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState({ type: "", message: "" });
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (!student?.id) {
      setError("Student session not found. Please login again.");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const [marksResponse, attendanceResponse, feeResponse] = await Promise.all([
          api.get(`/student-marks/${student.id}`),
          api.get(`/student-attendance/${student.id}`),
          api.get(`/student-fee/${student.id}`),
        ]);

        setMarks(marksResponse.data.marks || []);
        setAttendance(attendanceResponse.data.attendance || []);
        setFee(feeResponse.data.fee || null);
        setInstallments(feeResponse.data.installments || []);
        setPayments(feeResponse.data.payments || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load your dashboard right now."
        );
      }
    };

    fetchDashboardData();
  }, [student?.id]);

  const totalMarks = useMemo(
    () => marks.reduce((sum, item) => sum + Number(item.marks || 0), 0),
    [marks]
  );

  const percentage = marks.length
    ? ((totalMarks / (marks.length * 100)) * 100).toFixed(2)
    : "0.00";

  const topSubject = marks.length
    ? marks.reduce((best, current) =>
        Number(best.marks) > Number(current.marks) ? best : current
      )
    : null;

  const grade = Number(percentage) >= 90
    ? "A+"
    : Number(percentage) >= 80
      ? "A"
      : Number(percentage) >= 70
        ? "B"
        : Number(percentage) >= 60
          ? "C"
          : Number(percentage) >= 50
            ? "D"
            : "F";

  const presentCount = attendance.filter((item) => item.status === "Present").length;
  const absentCount = attendance.length - presentCount;
  const attendanceRate = attendance.length
    ? ((presentCount / attendance.length) * 100).toFixed(2)
    : "0.00";
  const feeStatus = fee?.fee_status || student.fee_status || "unpaid";
  const feeDue = Number(fee?.due_fee || student.due_fee || 0);
  const overviewCards = [
    {
      eyebrow: "Academic total",
      title: "Total Marks",
      value: totalMarks,
      note: "Combined score across all uploaded subjects.",
      tone: "primary",
    },
    {
      eyebrow: "Performance",
      title: "Percentage",
      value: `${percentage}%`,
      note: `Current grade standing: ${grade}.`,
      tone: "accent",
    },
    {
      eyebrow: "Attendance",
      title: "Attendance Rate",
      value: `${attendanceRate}%`,
      note: `${presentCount} present classes and ${absentCount} absences recorded.`,
      tone: "primary",
    },
    {
      eyebrow: "Fees",
      title: "Fee Status",
      value: feeStatus,
      note: `Outstanding balance: ${formatCurrency(feeDue)}.`,
      tone: feeDue > 0 ? "accent" : "neutral",
    },
  ];

  const marksChart = {
    labels: marks.map((item) => item.subject),
    datasets: [
      {
        label: "Marks",
        data: marks.map((item) => Number(item.marks)),
        backgroundColor: "#0f766e",
        borderRadius: 12,
      },
    ],
  };

  const marksChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 100,
      },
    },
  };

  const attendanceChart = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [presentCount, absentCount],
        backgroundColor: ["#15803d", "#dc2626"],
      },
    ],
  };

  const attendanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  const downloadPDF = async () => {
    const input = document.getElementById("student-report");
    if (!input) {
      return;
    }

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth() - 20;
    const pageHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 10, 10, pageWidth, pageHeight);
    pdf.save(`${student?.name || "student"}-report.pdf`);
  };

  const handleDummyPayment = async () => {
    const amount = Number(paymentAmount);

    if (!fee) {
      setPaymentStatus({ type: "error", message: "Fee details are not available." });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentStatus({ type: "error", message: "Enter a valid payment amount." });
      return;
    }

    setIsPaying(true);
    setPaymentStatus({ type: "", message: "" });

    try {
      const { data } = await api.post(`/students/${student.id}/pay-fee`, {
        amount,
        payment_method: "dummy-upi",
        notes: "Dummy payment from student portal",
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
      setPaymentStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setPaymentStatus({
        type: "error",
        message:
          requestError.response?.data?.message || "Unable to complete dummy payment.",
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (!student?.id) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <div className="page-header">
            <div>
              <h2>Student Dashboard</h2>
              <p>Please login again to continue.</p>
            </div>
          </div>
          <div className="button-row">
            <button className="primary-button" onClick={() => navigate("/student-login")}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card" id="student-report">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Student Portal</span>
            <h1>{student.name}</h1>
            <p className="hero-lead">
              {student.school_name ? `${student.school_name} (${student.school_code})` : "Student Portal"}
            </p>
            <div className="hero-meta">
              <span className="meta-chip">Student Code: {student.student_code || "Pending"}</span>
              <span className="meta-chip">
                Class {student.class} {student.section ? `- ${student.section}` : ""}
              </span>
              <span className={`status-pill status-pill--${getStatusTone(feeStatus)}`}>
                {feeStatus}
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button className="primary-button" onClick={downloadPDF}>
              Download PDF
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                clearStudentSession();
                navigate("/student-login");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="hero-grid">
          <div className="hero-panel hero-panel--accent">
            <span className="card-eyebrow">Progress Summary</span>
            <h3>{grade} grade with {percentage}% overall performance.</h3>
            <p className="muted-copy">
              {topSubject
                ? `${topSubject.subject} is currently your strongest subject with ${topSubject.marks} marks.`
                : "Marks will appear here as soon as subjects are uploaded."}
            </p>
            <div className="highlight-grid">
              <div className="highlight-card">
                <span className="highlight-value">{presentCount}</span>
                <span className="highlight-label">present classes</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">{installments.length}</span>
                <span className="highlight-label">installments in fee plan</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">{formatCurrency(feeDue)}</span>
                <span className="highlight-label">pending fee balance</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <span className="card-eyebrow">Quick Snapshot</span>
            <h3>Everything important in one glance</h3>
            <ul className="info-list">
              <li>
                <span>Roll Number</span>
                <strong>{student.roll_no || "Not available"}</strong>
              </li>
              <li>
                <span>Top Subject</span>
                <strong>{topSubject ? `${topSubject.subject} (${topSubject.marks})` : "N/A"}</strong>
              </li>
              <li>
                <span>Fee Status</span>
                <strong className="capitalize">{feeStatus}</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Overview</h3>
              <p className="section-caption">A quick read on performance, attendance, and fee position.</p>
            </div>
          </div>

          <div className="stats-grid">
            {overviewCards.map((item) => (
              <div key={item.title} className={`info-card stat-card stat-card--tone-${item.tone}`}>
                <span className="card-eyebrow">{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p
                  className="metric"
                  style={{ fontSize: item.title === "Fee Status" ? "1.45rem" : undefined, textTransform: item.title === "Fee Status" ? "capitalize" : "none" }}
                >
                  {item.value}
                </p>
                <p className="metric-note">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Performance Charts</h3>
              <p className="section-caption">Visual summaries for marks and attendance trends.</p>
            </div>
          </div>

          <div className="card-grid">
            <div className="info-card chart-card">
              <span className="card-eyebrow">Marks</span>
              <h3>Marks Overview</h3>
              {marks.length ? (
                <div className="dashboard-chart dashboard-chart-bar">
                  <Bar data={marksChart} options={marksChartOptions} />
                </div>
              ) : (
                <p className="empty-state">No marks uploaded yet.</p>
              )}
            </div>

            <div className="info-card chart-card">
              <span className="card-eyebrow">Attendance</span>
              <h3>Attendance Summary</h3>
              {attendance.length ? (
                <div className="dashboard-chart dashboard-chart-pie">
                  <Pie data={attendanceChart} options={attendanceChartOptions} />
                </div>
              ) : (
                <p className="empty-state">No attendance records yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Fee And Performance Details</h3>
              <p className="section-caption">Understand balance, payments, and academic highlights side by side.</p>
            </div>
          </div>

          <div className="card-grid">
            <div className="info-card">
              <span className="card-eyebrow">Fee Summary</span>
              <h3>Fee Summary</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span>Annual Fee</span>
                  <strong>{formatCurrency(fee?.annual_fee || student.annual_fee)}</strong>
                </div>
                <div className="detail-item">
                  <span>Paid Fee</span>
                  <strong>{formatCurrency(fee?.paid_fee || student.paid_fee)}</strong>
                </div>
                <div className="detail-item">
                  <span>Due Fee</span>
                  <strong>{formatCurrency(feeDue)}</strong>
                </div>
                <div className="detail-item">
                  <span>Current Status</span>
                  <strong className="capitalize">{feeStatus}</strong>
                </div>
              </div>

              <div className="field-group" style={{ marginTop: "12px" }}>
                <label htmlFor="dummy-payment-amount">Dummy Payment Amount</label>
                <input
                  id="dummy-payment-amount"
                  type="number"
                  min="1"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Enter amount to pay"
                />
              </div>
              {paymentStatus.message ? (
                <p className={`status-message ${paymentStatus.type}`}>{paymentStatus.message}</p>
              ) : null}

              <div className="button-row">
                <button
                  className="primary-button"
                  onClick={handleDummyPayment}
                  disabled={isPaying || feeDue <= 0}
                >
                  {isPaying ? "Processing..." : "Pay Fee (Dummy)"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => navigate("/student-checkout", { state: student })}
                >
                  Open Checkout Page
                </button>
              </div>
            </div>

            <div className="info-card">
              <span className="card-eyebrow">Performance Notes</span>
              <h3>Performance Notes</h3>
              <div className="detail-list">
                <div className="detail-item">
                  <span>Current Grade</span>
                  <strong>{grade}</strong>
                </div>
                <div className="detail-item">
                  <span>Top Subject</span>
                  <strong>{topSubject ? `${topSubject.subject} (${topSubject.marks})` : "N/A"}</strong>
                </div>
                <div className="detail-item">
                  <span>Present Classes</span>
                  <strong>{presentCount}</strong>
                </div>
                <div className="detail-item">
                  <span>Absent Classes</span>
                  <strong>{absentCount}</strong>
                </div>
                <div className="detail-item">
                  <span>Roll Number</span>
                  <strong>{student.roll_no || "Not available"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Academic And Fee Records</h3>
              <p className="section-caption">Detailed tables for installments, marks, and payment history.</p>
            </div>
          </div>

          <div className="card-grid">
            <div className="info-card table-panel">
              <div className="table-panel-header">
                <span className="card-eyebrow">Installments</span>
                <h3>Installment Plan</h3>
              </div>
              {installments.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Installment</th>
                        <th>Due</th>
                        <th>Paid</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((installment) => (
                        <tr key={installment.id}>
                          <td>{installment.installment_label}</td>
                          <td>{formatCurrency(installment.amount_due)}</td>
                          <td>{formatCurrency(installment.amount_paid)}</td>
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

            <div className="info-card table-panel">
              <div className="table-panel-header">
                <span className="card-eyebrow">Marks Ledger</span>
                <h3>Subject Scores</h3>
              </div>
              {marks.length ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Marks</th>
                        <th>Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marks.map((item) => (
                        <tr key={item.id}>
                          <td>{item.subject}</td>
                          <td>{item.marks}</td>
                          <td>{item.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-panel-header">
                  <p className="empty-state">No marks available yet.</p>
                </div>
              )}
            </div>

            <div className="info-card table-panel">
              <div className="table-panel-header">
                <span className="card-eyebrow">Payments</span>
                <h3>Payment History</h3>
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
                  <p className="empty-state">No fee payments recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
