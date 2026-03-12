import React from "react";
import { Link } from "react-router-dom";

function ViewReports() {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Reports 📊</h2>

      <ul>
        <li>
          <Link to="/attendance-reports">
            Attendance Reports
          </Link>
        </li>

        <li>
          <Link to="/marks-reports">
            Marks Reports
          </Link>
        </li>
      </ul>
    </div>
  );
}

export default ViewReports;
