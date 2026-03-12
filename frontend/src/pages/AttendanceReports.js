import React, { useEffect, useState } from "react";
import axios from "axios";

function AttendanceReports() {
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/attendance")
      .then((res) => {
        setAttendance(res.data);
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Attendance Reports 📅</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Student Name</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {attendance.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.student_name}</td>
              <td>{item.date}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AttendanceReports;
