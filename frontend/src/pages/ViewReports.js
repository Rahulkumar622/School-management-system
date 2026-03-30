import React from "react";
import { Link } from "react-router-dom";

import "../styles/appShell.css";

const reportOptions = [
  {
    title: "Attendance Reports",
    description: "Review attendance by student, subject, and date.",
    path: "/attendance-reports",
    eyebrow: "Daily tracking",
  },
  {
    title: "Marks Reports",
    description: "Review marks entries by student, subject, and year.",
    path: "/marks-reports",
    eyebrow: "Academic review",
  },
  {
    title: "Payment Reports",
    description: "See which students paid fees and which payment reference was generated.",
    path: "/payment-reports",
    eyebrow: "Collections",
  },
  {
    title: "Admissions & Admins",
    description: "Review schools, school admins, and admission pipeline context.",
    path: "/school-management",
    eyebrow: "Operations",
  },
];

function ViewReports() {
  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Report Center</span>
            <h2>Reports</h2>
            <p className="hero-lead">Choose the reporting view you want to review.</p>
            <div className="hero-meta">
              <span className="meta-chip">{reportOptions.length} reporting surfaces</span>
              <span className="meta-chip">Attendance, marks, payments, and admin context</span>
            </div>
          </div>
        </div>

        <div className="hero-grid">
          <div className="hero-panel hero-panel--accent">
            <span className="card-eyebrow">Reporting Snapshot</span>
            <h3>Move from raw records to decisions faster.</h3>
            <p className="muted-copy">
              Each report starts from a focused use case so admins can inspect patterns without digging through unrelated screens.
            </p>
            <div className="highlight-grid">
              <div className="highlight-card">
                <span className="highlight-value">Attendance</span>
                <span className="highlight-label">daily class activity and presence trends</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">Marks</span>
                <span className="highlight-label">subject-wise academic performance records</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">Payments</span>
                <span className="highlight-label">fee collection visibility and references</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <span className="card-eyebrow">Use This Hub For</span>
            <h3>Fast entry into the right reporting lens</h3>
            <ul className="info-list">
              <li>
                <span>Academic review</span>
                <strong>Marks + attendance</strong>
              </li>
              <li>
                <span>Financial check</span>
                <strong>Payment status</strong>
              </li>
              <li>
                <span>Operational context</span>
                <strong>Schools + admissions</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Available Reports</h3>
              <p className="section-caption">Open the view that matches the question you need to answer.</p>
            </div>
          </div>

          <div className="action-grid">
            {reportOptions.map((report) => (
              <Link key={report.path} className="quick-link" to={report.path}>
                <div className="info-card action-card full-width-card">
                  <span className="card-eyebrow">{report.eyebrow}</span>
                  <h3>{report.title}</h3>
                  <p>{report.description}</p>
                  <span className="card-link">Open report</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewReports;
