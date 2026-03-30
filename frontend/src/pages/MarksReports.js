import React, { useEffect, useState } from "react";

import api from "../api";
import "../styles/appShell.css";

function MarksReports() {
  const [marks, setMarks] = useState([]);
  const [error, setError] = useState("");
  const averageMarks = marks.length
    ? (
        marks.reduce((sum, item) => sum + Number(item.marks || 0), 0) / marks.length
      ).toFixed(2)
    : "0.00";

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const { data } = await api.get("/marks");
        setMarks(data.marks || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to load marks reports."
        );
      }
    };

    fetchMarks();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Marks Reports</span>
            <h2>Marks Reports</h2>
            <p className="hero-lead">Review marks by school, student, subject, and academic year.</p>
            <div className="hero-meta">
              <span className="meta-chip">{marks.length} entries</span>
              <span className="meta-chip">Average {averageMarks}</span>
            </div>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        <div className="card-grid">
          <div className="info-card stat-card stat-card--tone-primary">
            <span className="card-eyebrow">Marks Entries</span>
            <h3>Total Records</h3>
            <p className="metric">{marks.length}</p>
            <p className="metric-note">All marks records currently visible in this report.</p>
          </div>
          <div className="info-card stat-card stat-card--tone-accent">
            <span className="card-eyebrow">Average Score</span>
            <h3>Average Marks</h3>
            <p className="metric">{averageMarks}</p>
            <p className="metric-note">Mean score across all listed marks entries.</p>
          </div>
        </div>

        <div className="info-card table-panel panel-top-gap">
          <div className="table-panel-header">
            <h3>Marks Ledger</h3>
            <p className="section-caption">Scroll sideways on smaller screens to inspect the full marks table.</p>
          </div>

          {marks.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((item) => (
                    <tr key={item.id}>
                      <td>{item.school_name || "-"}</td>
                      <td>{item.student_name}</td>
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
              <p className="empty-state">No marks records available yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MarksReports;
