import React from "react";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Sidebar */}
      <div style={{
        width: "220px",
        background: "#1e293b",
        color: "white",
        padding: "20px"
      }}>
        <h2>📘 School</h2>
        <hr />
        <p><Link to="/add-student" style={linkStyle}>➕ Add Student</Link></p>
        <p><Link to="/view-students" style={linkStyle}>👨‍🎓 View Students</Link></p>
        <p><Link to="/attendance-reports" style={linkStyle}>📅 Attendance</Link></p>
        <p><Link to="/marks-reports" style={linkStyle}>📝 Marks</Link></p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "40px", background: "#f1f5f9" }}>
        <h1>Welcome Rahul 👋</h1>

        <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>

          <div style={cardStyle}>
            <h3>Total Students</h3>
            <h1>👨‍🎓</h1>
          </div>

          <div style={cardStyle}>
            <h3>Attendance</h3>
            <h1>📅</h1>
          </div>

          <div style={cardStyle}>
            <h3>Marks Reports</h3>
            <h1>📝</h1>
          </div>

        </div>
      </div>

    </div>
  );
}

const linkStyle = {
  color: "white",
  textDecoration: "none"
};

const cardStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "10px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  flex: 1,
  textAlign: "center"
};

export default Dashboard;