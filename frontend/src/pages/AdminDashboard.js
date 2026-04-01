import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { clearAdminSession, getAdminSession } from "../session";
import SchoolAdminWorkspace from "./SchoolAdminWorkspace";
import "../styles/appShell.css";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const admin = location.state || getAdminSession();
  const isSchoolAdmin = admin?.role === "school_admin";
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const actions = isSchoolAdmin
    ? [
        {
          title: "Add Student",
          description: "Create students for your assigned school only.",
          path: "/add-student",
        },
        {
          title: "View Students",
          description: "Track fee paid, partial, and unpaid students.",
          path: "/view-students",
        },
        {
          title: "Add Teacher",
          description: "Create teachers under your school.",
          path: "/add-teacher",
        },
        {
          title: "Reports",
          description: "Review attendance, marks, and payments.",
          path: "/view-reports",
        },
      ]
    : [
        {
          title: "Manage Schools",
          description: "Create, edit, delete schools, and monitor owner-side fee status.",
          path: "/school-management",
        },
      ];

  useEffect(() => {
    if (!admin?.id && !admin?.role) {
      return;
    }

    const loadDashboard = async () => {
      setIsLoading(true);

      try {
        if (isSchoolAdmin && admin?.school_id) {
          const { data } = await api.get(`/schools/${admin.school_id}/dashboard`);
          setStats(data.stats || null);
        } else {
          const { data } = await api.get("/owner/dashboard");
          setStats(data.stats || null);
        }

        setError("");
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to load dashboard summary."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [admin?.id, admin?.role, admin?.school_id, isSchoolAdmin]);

  const dashboardCards = useMemo(() => {
    if (!stats) {
      return [];
    }

    if (isSchoolAdmin) {
      return [
        {
          title: "Students",
          eyebrow: "Enrollment",
          value: stats.students ?? 0,
          note: "Active students inside your campus records.",
          tone: "primary",
        },
        {
          title: "Teachers",
          eyebrow: "Staff",
          value: stats.teachers ?? 0,
          note: "Teacher accounts created for your school.",
          tone: "neutral",
        },
        {
          title: "Admissions",
          eyebrow: "Pipeline",
          value: stats.admissions ?? 0,
          note: "Applications waiting in the admission flow.",
          tone: "accent",
        },
        {
          title: "Paid Students",
          eyebrow: "Fee health",
          value: stats.paid_students ?? 0,
          note: "Students with fee fully cleared.",
          tone: "primary",
        },
        {
          title: "Fee Pending",
          eyebrow: "Collections",
          value: stats.unpaid_students ?? 0,
          note: "Students still carrying pending fee.",
          tone: "accent",
        },
        {
          title: "Due Fee",
          eyebrow: "Balance",
          value: formatCurrency(stats.due_fee),
          note: "Outstanding collection still pending.",
          tone: "neutral",
        },
      ];
    }

    return [
      {
        title: "Client Schools",
        eyebrow: "Network",
        value: stats.schools ?? 0,
        note: "Schools currently tracked in the platform.",
        tone: "primary",
      },
      {
        title: "Active Schools",
        eyebrow: "Subscription",
        value: stats.active_schools ?? 0,
        note: "Campuses with active software access.",
        tone: "neutral",
      },
      {
        title: "School Admins",
        eyebrow: "Accounts",
        value: stats.school_admins ?? 0,
        note: "Admins managing day-to-day client activity.",
        tone: "neutral",
      },
      {
        title: "Fee Paid Schools",
        eyebrow: "Collections",
        value: stats.paid_schools ?? 0,
        note: "Client schools with cleared software dues.",
        tone: "primary",
      },
      {
        title: "Fee Pending Schools",
        eyebrow: "Attention",
        value: stats.pending_fee_schools ?? 0,
        note: "Schools that still need payment follow-up.",
        tone: "accent",
      },
      {
        title: "Collected Amount",
        eyebrow: "Revenue",
        value: formatCurrency(stats.collected_amount),
        note: "Total amount collected across client schools.",
        tone: "primary",
      },
      {
        title: "Due Amount",
        eyebrow: "Outstanding",
        value: formatCurrency(stats.due_amount),
        note: "Total software fee still pending.",
        tone: "accent",
      },
    ];
  }, [isSchoolAdmin, stats]);

  const statusTone = (() => {
    const normalizedStatus = String(admin?.subscription_status || "active").toLowerCase();
    if (normalizedStatus === "active") {
      return "success";
    }

    if (normalizedStatus === "inactive" || normalizedStatus === "suspended") {
      return "danger";
    }

    return "warning";
  })();

  if (isSchoolAdmin) {
    return (
      <SchoolAdminWorkspace
        admin={admin}
        stats={stats}
        error={error}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">
              {isSchoolAdmin ? "School Admin Workspace" : "Software Owner Control Center"}
            </span>
            <h1>{isSchoolAdmin ? "School Admin Dashboard" : "Software Owner Dashboard"}</h1>
            <p className="hero-lead">
              {admin?.school_name
                ? `${admin.school_name} (${admin.school_code})`
                : "Manage all client schools and platform operations from one place."}
            </p>
            <div className="hero-meta">
              <span className="meta-chip">{admin?.name || "Platform operator"}</span>
              <span className="meta-chip">
                {isSchoolAdmin ? "School operations" : "Multi-school oversight"}
              </span>
              {admin?.school_code ? <span className="meta-chip">{admin.school_code}</span> : null}
              <span className={`status-pill status-pill--${statusTone}`}>
                {admin?.subscription_status || "active"}
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="secondary-button"
              onClick={() => {
                clearAdminSession();
                navigate("/admin-login");
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="hero-grid">
          <div className="hero-panel hero-panel--accent">
            <span className="card-eyebrow">
              {isSchoolAdmin ? "Campus Snapshot" : "Platform Snapshot"}
            </span>
            <h3>
              {isSchoolAdmin
                ? "Keep admissions, collections, and campus operations aligned."
                : "Track client school health, billing, and platform reach from one surface."}
            </h3>
            <p className="muted-copy">
              {isSchoolAdmin
                ? "Use this dashboard as the command post for student growth, teacher setup, and report review."
                : "Review the overall business view before drilling into school-level actions and billing follow-ups."}
            </p>
            <div className="highlight-grid">
              {isSchoolAdmin ? (
                <>
                  <div className="highlight-card">
                    <span className="highlight-value">{stats?.students ?? 0}</span>
                    <span className="highlight-label">students managed</span>
                  </div>
                  <div className="highlight-card">
                    <span className="highlight-value">{stats?.admissions ?? 0}</span>
                    <span className="highlight-label">admissions in pipeline</span>
                  </div>
                  <div className="highlight-card">
                    <span className="highlight-value">{formatCurrency(stats?.due_fee)}</span>
                    <span className="highlight-label">current fee due</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="highlight-card">
                    <span className="highlight-value">{stats?.schools ?? 0}</span>
                    <span className="highlight-label">client schools</span>
                  </div>
                  <div className="highlight-card">
                    <span className="highlight-value">{formatCurrency(stats?.collected_amount)}</span>
                    <span className="highlight-label">collected software fee</span>
                  </div>
                  <div className="highlight-card">
                    <span className="highlight-value">{stats?.pending_fee_schools ?? 0}</span>
                    <span className="highlight-label">schools needing follow-up</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="hero-panel">
            <span className="card-eyebrow">Operating Focus</span>
            <h3>{isSchoolAdmin ? "What to check next" : "What to monitor next"}</h3>
            <ul className="info-list">
              {isSchoolAdmin ? (
                <>
                  <li>
                    <span>Student and teacher records</span>
                    <strong>Daily admin flow</strong>
                  </li>
                  <li>
                    <span>Admissions awaiting action</span>
                    <strong>{stats?.admissions ?? 0}</strong>
                  </li>
                  <li>
                    <span>Pending student fee balance</span>
                    <strong>{formatCurrency(stats?.due_fee)}</strong>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <span>Active client schools</span>
                    <strong>{stats?.active_schools ?? 0}</strong>
                  </li>
                  <li>
                    <span>School admins onboarded</span>
                    <strong>{stats?.school_admins ?? 0}</strong>
                  </li>
                  <li>
                    <span>Total due amount</span>
                    <strong>{formatCurrency(stats?.due_amount)}</strong>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Dashboard summary load ho rahi hai...</p>
        ) : dashboardCards.length ? (
          <div className="section-stack">
            <div className="section-heading">
              <div>
                <h3>Key Metrics</h3>
                <p className="section-caption">A quick read on the numbers that matter most right now.</p>
              </div>
            </div>

            <div className="stats-grid">
            {dashboardCards.map((item) => (
                <div key={item.title} className={`info-card stat-card stat-card--tone-${item.tone}`}>
                  <span className="card-eyebrow">{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p
                    className="metric"
                    style={{ fontSize: typeof item.value === "string" ? "1.35rem" : undefined }}
                  >
                    {item.value}
                  </p>
                  <p className="metric-note">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Quick Actions</h3>
              <p className="section-caption">Jump straight into the most common admin tasks.</p>
            </div>
          </div>

          <div className="action-grid">
            {actions.map((action) => (
              <Link key={action.path} className="quick-link" to={action.path}>
                <div className="info-card action-card full-width-card">
                  <span className="card-eyebrow">{isSchoolAdmin ? "Campus task" : "Owner task"}</span>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                  <span className="card-link">Open workspace</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
