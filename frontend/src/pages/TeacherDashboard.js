import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../api";
import { clearTeacherSession, getTeacherSession } from "../session";
import "../styles/appShell.css";

const formatDate = (value) => String(value || "").slice(0, 10) || "Not available";

function TeacherDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const teacher = location.state || getTeacherSession();

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const params = teacher?.school_id ? { schoolId: teacher.school_id } : undefined;
        const [studentsResponse, attendanceResponse, marksResponse] = await Promise.all([
          api.get("/students", { params }),
          api.get("/attendance", { params }),
          api.get("/marks", { params }),
        ]);

        setStudents(studentsResponse.data.students || []);
        setAttendance(attendanceResponse.data.attendance || []);
        setMarks(marksResponse.data.marks || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load the teacher dashboard."
        );
      }
    };

    fetchDashboardData();
  }, [teacher?.school_id]);

  const latestEntries = useMemo(() => attendance.slice(0, 5), [attendance]);
  const pendingFeeStudents = students.filter((student) => student.fee_status !== "paid").length;
  const overviewCards = [
    {
      eyebrow: "Students",
      title: "Total Students",
      value: students.length,
      note: "Students currently available in your school roster.",
      tone: "primary",
    },
    {
      eyebrow: "Attendance",
      title: "Attendance Records",
      value: attendance.length,
      note: "Total attendance entries already saved.",
      tone: "neutral",
    },
    {
      eyebrow: "Marks",
      title: "Marks Entries",
      value: marks.length,
      note: "Subject score entries uploaded by staff.",
      tone: "primary",
    },
    {
      eyebrow: "Fees",
      title: "Fee Pending Students",
      value: pendingFeeStudents,
      note: "Students whose fee status is still not fully paid.",
      tone: "accent",
    },
  ];

  const quickActions = [
    {
      title: "Mark Attendance",
      description: "Save daily attendance for students in your school.",
      path: "/mark-attendance",
    },
    {
      title: "Bulk Attendance",
      description: "Load a complete class and mark all students in one go.",
      path: "/bulk-attendance",
    },
    {
      title: "Upload Marks",
      description: "Add subject marks for students in your school.",
      path: "/update-marks",
    },
    {
      title: "View Students",
      description: "Check class records and see who still has fee pending.",
      path: "/view-students",
    },
  ];

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Teacher Workspace</span>
            <h1>{teacher?.name ? `Welcome, ${teacher.name}` : "Teacher Dashboard"}</h1>
            <p className="hero-lead">
              {teacher?.school_name
                ? `Working inside ${teacher.school_name} (${teacher.school_code}).`
                : "Manage school-specific student operations from here."}
            </p>
            <div className="hero-meta">
              <span className="meta-chip">Attendance + marks</span>
              <span className="meta-chip">{students.length} students loaded</span>
              {teacher?.school_code ? <span className="meta-chip">{teacher.school_code}</span> : null}
            </div>
          </div>

          <div className="header-actions">
            {!teacher?.id ? (
              <button className="secondary-button" onClick={() => navigate("/teacher-login")}>
                Go to Login
              </button>
            ) : (
              <button
                className="secondary-button"
                onClick={() => {
                  clearTeacherSession();
                  navigate("/teacher-login");
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="hero-grid">
          <div className="hero-panel hero-panel--accent">
            <span className="card-eyebrow">Teaching Pulse</span>
            <h3>Classroom operations, reports, and student visibility stay together.</h3>
            <p className="muted-copy">
              Use the teacher workspace to move from attendance to marks updates without switching context.
            </p>
            <div className="highlight-grid">
              <div className="highlight-card">
                <span className="highlight-value">{students.length}</span>
                <span className="highlight-label">students in roster</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">{latestEntries.length}</span>
                <span className="highlight-label">recent attendance entries</span>
              </div>
              <div className="highlight-card">
                <span className="highlight-value">{pendingFeeStudents}</span>
                <span className="highlight-label">students with fee pending</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <span className="card-eyebrow">Today Focus</span>
            <h3>Keep an eye on these signals</h3>
            <ul className="info-list">
              <li>
                <span>Attendance records saved</span>
                <strong>{attendance.length}</strong>
              </li>
              <li>
                <span>Marks entries uploaded</span>
                <strong>{marks.length}</strong>
              </li>
              <li>
                <span>Latest activity date</span>
                <strong>{latestEntries[0] ? formatDate(latestEntries[0].date) : "No activity"}</strong>
              </li>
            </ul>
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Overview</h3>
              <p className="section-caption">Your most important classroom metrics at a glance.</p>
            </div>
          </div>

          <div className="stats-grid">
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
              <h3>Quick Actions</h3>
              <p className="section-caption">Jump into the classroom tasks teachers use most often.</p>
            </div>
          </div>

          <div className="action-grid">
            {quickActions.map((action) => (
              <Link key={action.path} className="quick-link" to={action.path}>
                <div className="info-card action-card full-width-card">
                  <span className="card-eyebrow">Teacher task</span>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                  <span className="card-link">Open workspace</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="section-stack">
          <div className="section-heading">
            <div>
              <h3>Recent Attendance Activity</h3>
              <p className="section-caption">The latest recorded attendance updates in your school.</p>
            </div>
          </div>

          <div className="info-card table-panel">
            {latestEntries.length ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Subject</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestEntries.map((item) => (
                      <tr key={item.id}>
                        <td>{item.student_name}</td>
                        <td>{item.subject}</td>
                        <td>{formatDate(item.date)}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-panel-header">
                <p className="empty-state">No attendance activity recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
