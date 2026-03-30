import React from "react";
import { useNavigate } from "react-router-dom";

import "./styles/loginSelect.css";

const loginOptions = [
  {
    title: "Student Login",
    description: "Open marks, attendance, fee status, and checkout in one clean workspace.",
    tag: "Performance + fees",
    audience: "For students",
    tone: "teal",
    path: "/student-login",
  },
  {
    title: "Teacher Login",
    description: "Manage attendance, marks, and daily class operations school-wise.",
    tag: "Classroom operations",
    audience: "For teachers",
    tone: "blue",
    path: "/teacher-login",
  },
  {
    title: "Admin Login",
    description: "Use software owner or school admin access for operations and billing visibility.",
    tag: "Owner + school admin",
    audience: "For management",
    tone: "amber",
    path: "/admin-login",
  },
  {
    title: "Parent Portal",
    description: "Track admissions, student performance, and child fee updates.",
    tag: "Family visibility",
    audience: "For parents",
    tone: "slate",
    path: "/parent-login",
  },
  {
    title: "Admission Form",
    description: "Submit a new student admission request online without visiting the office first.",
    tag: "Admissions flow",
    audience: "Open access",
    tone: "emerald",
    path: "/admission-form",
  },
];

const platformStats = [
  { value: "5", label: "role-based portals" },
  { value: "1", label: "shared school workspace" },
  { value: "Live", label: "dashboards and reports" },
];

const platformHighlights = [
  "Admissions, fee tracking, reports, and classroom workflows stay connected.",
  "Each role starts in a focused portal instead of a crowded all-in-one screen.",
  "Designed for multi-school operations with owner, admin, staff, parent, and student access.",
];

function LoginSelect() {
  const navigate = useNavigate();

  return (
    <div className="select-container">
      <div className="select-shell">
        <div className="select-hero">
          <div className="select-copy">
            <p className="select-eyebrow">School Management System</p>
            <h1>One ERP surface for every school role.</h1>
            <p className="select-subtitle">
              Admissions, academics, billing, and daily operations arranged around the people who use them every day.
            </p>

            <div className="select-pill-row">
              <span className="select-pill">Multi-school ready</span>
              <span className="select-pill">Fee-aware workflows</span>
              <span className="select-pill">Live academic dashboards</span>
            </div>

            <div className="select-stats">
              {platformStats.map((item) => (
                <div key={item.label} className="select-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="select-brief">
            <p className="select-brief-label">Operations Snapshot</p>
            <h2>Move from login to action with less clutter.</h2>
            <ul className="select-brief-list">
              {platformHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="portal-header">
          <div>
            <h2>Choose your portal</h2>
            <p>Start from the role you want to work in right now.</p>
          </div>
          <p className="portal-note">Focused entry points for every stakeholder</p>
        </div>

        <div className="card-container">
          {loginOptions.map((option) => (
            <button
              key={option.path}
              className={`login-option login-option--${option.tone}`}
              onClick={() => navigate(option.path)}
            >
              <div className="login-option-top">
                <span className="login-option-tag">{option.tag}</span>
                <span className="login-option-audience">{option.audience}</span>
              </div>
              <span className="login-option-title">{option.title}</span>
              <span className="login-option-description">{option.description}</span>
              <span className="login-option-cta">Open portal</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginSelect;
