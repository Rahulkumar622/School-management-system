import React, { useEffect, useState } from "react";
import axios from "axios";

function ViewStudents() {
  const [students, setStudents] = useState([]);

  // Fetch Students
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/students"
      );

      setStudents(res.data);
    } catch (error) {
      console.log("Error fetching students ❌", error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📚 View All Students</h2>

      {students.length === 0 ? (
        <p>No Students Found ❌</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Class</th>
              <th>Email</th>
            </tr>
          </thead>

          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.class}</td>
                <td>{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ViewStudents;
