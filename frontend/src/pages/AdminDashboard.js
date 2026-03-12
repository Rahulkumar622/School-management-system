

import React from "react";
import { Link } from "react-router-dom";

function AdminDashboard() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Admin Dashboard 🏫</h2>

      <ul>
        <li>
          <Link to="/add-student">
            Add Student
          </Link>
        </li>

        <li>
          <Link to="/view-students">
            View Students
          </Link>
        </li>

        <li>
          <Link to="/add-teacher">
            Add Teacher
          </Link>
        </li>

        <li>
          <Link to="/view-reports">
            View Reports
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default AdminDashboard;
