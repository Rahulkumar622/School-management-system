import React, { useEffect, useState } from "react";
import axios from "axios";

function MarksReports() {
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/marks")
      .then((res) => {
        setMarks(res.data);
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Marks Reports 📝</h2>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Student Name</th>
            <th>Subject</th>
            <th>Marks</th>
          </tr>
        </thead>

        <tbody>
          {marks.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.student_name}</td>
              <td>{item.subject}</td>
              <td>{item.marks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MarksReports;
