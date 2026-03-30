import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { clearParentSession, getParentSession } from "../session";
import "../styles/appShell.css";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

function ParentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const parentSession = location.state || getParentSession();

  const [admissions, setAdmissions] = useState([]);
  const [children, setChildren] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!parentSession?.id) {
      setError("Parent session not found. Please login again.");
      return;
    }

    const loadDashboard = async () => {
      try {
        const { data } = await api.get(`/parents/${parentSession.id}/dashboard`);
        setAdmissions(data.admissions || []);
        setChildren(data.children || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to load parent dashboard."
        );
      }
    };

    loadDashboard();
  }, [parentSession?.id]);

  const averagePercentage = useMemo(() => {
    if (!children.length) {
      return 0;
    }

    const total = children.reduce(
      (sum, child) => sum + Number(child.percentage || 0),
      0
    );

    return (total / children.length).toFixed(2);
  }, [children]);

  const overviewCards = [
    {
      eyebrow: "Admissions",
      title: "Applications Sent",
      value: admissions.length,
      note: "Forms or requests already submitted by this parent account.",
      tone: "primary",
    },
    {
      eyebrow: "Students",
      title: "Linked Children",
      value: children.length,
      note: "Student records currently connected with your parent profile.",
      tone: "neutral",
    },
    {
      eyebrow: "Performance",
      title: "Average Performance",
      value: `${averagePercentage}%`,
      note: "Average marks percentage across linked children.",
      tone: "accent",
    },
  ];

  if (!parentSession?.id) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <p className="status-message error">{error}</p>
          <div className="button-row">
            <button className="primary-button" onClick={() => navigate("/parent-login")}>
              Back to Parent Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Parent Dashboard</span>
            <h2>{parentSession.name}</h2>
            <p className="hero-lead">
              {parentSession.school_name} ({parentSession.school_code})
            </p>
            <div className="hero-meta">
              <span className="meta-chip">{children.length} linked children</span>
              <span className="meta-chip">{admissions.length} admissions</span>
              <span className="meta-chip">{parentSession.school_code}</span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="secondary-button"
              onClick={() => {
                clearParentSession();
                navigate("/parent-login");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="hero-grid">
          <div className="hero-panel hero-panel--accent">
            <span className="card-eyebrow">Family Snapshot</span>
            <h3>Stay close to admissions, academics, and fee updates without calling the office.</h3>
            <p className="muted-copy">
              This view keeps application progress and child performance in one readable dashboard.
            </p>
            <div className="highlight-grid">
              <div className="highlight-card">
                <span className="highlight-value">{admissions.length}</span>
                <span className="highlight-label">admissions submitted</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">{children.length}</span>
                <span className="highlight-label">linked children</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">{averagePercentage}%</span>
                <span className="highlight-label">average marks performance</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <span className="card-eyebrow">Account Overview</span>
            <h3>What this parent account can see</h3>
            <ul className="info-list">
              <li>
                <span>School</span>
                <strong>{parentSession.school_name}</strong>
              </li>
              <li>
                <span>Children linked</span>
                <strong>{children.length}</strong>
              </li>
              <li>
                <span>Admissions in queue</span>
                <strong>{admissions.length}</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Overview</h3>
              <p className="section-caption">A quick summary of your family-facing dashboard.</p>
            </div>
          </div>

          <div className="card-grid">
            {overviewCards.map((item) => (
              <div key={item.title} className={`info-card stat-card stat-card--tone-${item.tone}`}>
                <span className="card-eyebrow">{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p className="metric">{item.value}</p>
                <p className="metric-note">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Admission Applications</h3>
              <p className="section-caption">Track the current state of submitted admission requests.</p>
            </div>
          </div>

          <div className="info-card table-panel">
            {admissions.length ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((admission) => (
                      <tr key={admission.id}>
                        <td>{admission.student_name}</td>
                        <td>{admission.class_name}</td>
                        <td className="capitalize">{admission.status}</td>
                        <td>{admission.reference_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-panel-header">
                <p className="empty-state">No admissions submitted yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Children Overall Performance</h3>
              <p className="section-caption">A readable card for each linked child, including academic and fee context.</p>
            </div>
          </div>

          {children.length ? (
            <div className="summary-grid">
              {children.map((child) => (
                <div key={child.id} className="info-card">
                  <span className="card-eyebrow">{child.student_code || "Student profile"}</span>
                  <h3>{child.name}</h3>
                  <p className="muted-note">
                    Class {child.class}
                    {child.section ? ` - ${child.section}` : ""}
                  </p>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span>Marks Percentage</span>
                      <strong>{Number(child.percentage || 0).toFixed(2)}%</strong>
                    </div>
                    <div className="detail-item">
                      <span>Grade</span>
                      <strong>{child.grade}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Attendance</span>
                      <strong>{Number(child.attendance_percentage || 0).toFixed(2)}%</strong>
                    </div>
                    <div className="detail-item">
                      <span>Top Subject</span>
                      <strong>{child.top_subject || "N/A"}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Paid Fee</span>
                      <strong>{formatCurrency(child.paid_fee)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Due Fee</span>
                      <strong>{formatCurrency(child.due_fee)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Fee Status</span>
                      <strong className="capitalize">{child.fee_status}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="info-card">
              <p className="empty-state">No linked students available yet.</p>
            </div>
          )}
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Children Fee Snapshot</h3>
              <p className="section-caption">Compare performance, attendance, and fee balances side by side.</p>
            </div>
          </div>

          <div className="info-card table-panel">
            {children.length ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Performance</th>
                      <th>Attendance</th>
                      <th>Paid</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child) => (
                      <tr key={child.id}>
                        <td>{child.name}</td>
                        <td>{child.class}</td>
                        <td>{Number(child.percentage || 0).toFixed(2)}%</td>
                        <td>{Number(child.attendance_percentage || 0).toFixed(2)}%</td>
                        <td>{formatCurrency(child.paid_fee)}</td>
                        <td>{formatCurrency(child.due_fee)}</td>
                        <td className="capitalize">{child.fee_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-panel-header">
                <p className="empty-state">No linked students available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParentDashboard;
