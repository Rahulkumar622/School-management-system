import React from "react";
import { Link } from "react-router-dom";

function TeacherDashboard() {
  return (
    <div style={{ padding: "20px" }}>
      
      <h1>Teacher Dashboard 👨‍🏫</h1>
      <h3>Welcome Teacher</h3>

      <ul>

        {/* Mark Attendance */}
        <li>
          <Link to="/mark-attendance">
            Mark Attendance
          </Link>
        </li>

        {/* Update Marks */}
        <li>
          <Link to="/update-marks">
            Update Student Marks
          </Link>
        </li>

        {/* View Students */}
        <li>
          <Link to="/view-students">
            View Students
          </Link>
        </li>

      </ul>

    </div>
  );
}

export default TeacherDashboard;
