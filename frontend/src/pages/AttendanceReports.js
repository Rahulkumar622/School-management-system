import React, { useEffect, useState } from "react";

import api from "../api";
import "../styles/appShell.css";

function AttendanceReports() {
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState("");
  const presentCount = attendance.filter((item) => item.status === "Present").length;
  const absentCount = attendance.length - presentCount;

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const { data } = await api.get("/attendance");
        setAttendance(data.attendance || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load attendance reports."
        );
      }
    };

    fetchAttendance();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Attendance Reports</span>
            <h2>Attendance Reports</h2>
            <p className="hero-lead">Track saved attendance entries across schools, students, and subjects.</p>
            <div className="hero-meta">
              <span className="meta-chip">{attendance.length} records</span>
              <span className="meta-chip">{presentCount} present</span>
              <span className="meta-chip">{absentCount} absent</span>
            </div>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="card-grid">
          <div className="info-card stat-card stat-card--tone-primary">
            <span className="card-eyebrow">Saved Records</span>
            <h3>Total Entries</h3>
            <p className="metric">{attendance.length}</p>
            <p className="metric-note">Attendance entries currently available in the report.</p>
          </div>
          <div className="info-card stat-card stat-card--tone-neutral">
            <span className="card-eyebrow">Present</span>
            <h3>Present Count</h3>
            <p className="metric">{presentCount}</p>
            <p className="metric-note">Entries marked present across the current dataset.</p>
          </div>
          <div className="info-card stat-card stat-card--tone-accent">
            <span className="card-eyebrow">Absent</span>
            <h3>Absent Count</h3>
            <p className="metric">{absentCount}</p>
            <p className="metric-note">Entries marked absent across the current dataset.</p>
          </div>
        </div>

        <div className="info-card table-panel panel-top-gap">
          <div className="table-panel-header">
            <h3>Attendance Ledger</h3>
            <p className="section-caption">Scroll sideways on smaller screens to view the complete report table.</p>
          </div>

          {attendance.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((item) => (
                    <tr key={item.id}>
                      <td>{item.school_name || "-"}</td>
                      <td>{item.student_name}</td>
                      <td>{item.subject}</td>
                      <td>{String(item.date).slice(0, 10)}</td>
                      <td className="capitalize">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">No attendance records available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceReports;
