// import { useState } from "react";
// import axios from "axios";

// function MarkAttendance() {

//   const [studentId, setStudentId] = useState("");
//   const [studentName, setStudentName] = useState("");   // ✅ Added
//   const [subject, setSubject] = useState("");
//   const [status, setStatus] = useState("");

//   // ✅ Auto Fetch Student
//   const fetchStudent = (id) => {
//     if (!id) return;

//     axios
//       .get(`http://localhost:5000/student/${id}`)
//       .then((res) => {
//         setStudentName(res.data.name);
//       })
//       .catch((err) => console.log(err));
//   };

//   // ✅ Submit Attendance
//   const handleSubmit = () => {
//     const data = {
//       student_id: studentId,
//       subject: subject,
//       date: new Date(),
//       status: status
//     };

//     axios
//       .post("http://localhost:5000/mark-attendance", data)
//       .then(() => alert("Attendance Marked ✅"))
//       .catch((err) => console.log(err));
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Mark Attendance 📋</h2>

//       {/* Student ID */}
//       <input
//         placeholder="Student ID"
//         onChange={(e) => {
//           setStudentId(e.target.value);
//           fetchStudent(e.target.value);
//         }}
//       />

//       <br /><br />

//       {/* Auto Name */}
//       <input
//         value={studentName}
//         placeholder="Student Name"
//         readOnly
//       />

//       <br /><br />

//       {/* Subject */}
//       <input
//         placeholder="Subject"
//         onChange={(e) => setSubject(e.target.value)}
//       />

//       <br /><br />

//       {/* Status */}
//       <select onChange={(e) => setStatus(e.target.value)}>
//         <option value="">Select Status</option>
//         <option value="Present">Present</option>
//         <option value="Absent">Absent</option>
//       </select>

//       <br /><br />

//       <button onClick={handleSubmit}>
//         Submit
//       </button>
//     </div>
//   );
// }

// export default MarkAttendance;



import { useState } from "react";
import axios from "axios";

function MarkAttendance() {

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");

  // Auto Fetch Student Name
  const fetchStudent = (id) => {

    if (!id) return;

    axios
      .get(`http://localhost:5000/student/${id}`)
      .then((res) => {
        setStudentName(res.data.name);
      })
      .catch((err) => console.log(err));
  };

  // Submit Attendance
  const handleSubmit = () => {

    const data = {
      student_id: studentId,
      student_name: studentName,
      subject: subject,
      date: new Date(),
      status: status
    };

    axios
      .post("http://localhost:5000/mark-attendance", data)
      .then(() => alert("Attendance Marked ✅"))
      .catch((err) => console.log(err));
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>Mark Attendance 📋</h2>

      {/* Student ID */}
      <input
        placeholder="Student ID"
        onChange={(e) => {
          setStudentId(e.target.value);
          fetchStudent(e.target.value);
        }}
      />

      <br /><br />

      {/* Auto Name */}
      <input
        value={studentName}
        placeholder="Student Name"
        readOnly
      />

      <br /><br />

      {/* Subject */}
      <input
        placeholder="Subject"
        onChange={(e) => setSubject(e.target.value)}
      />

      <br /><br />

      {/* Status */}
      <select onChange={(e) => setStatus(e.target.value)}>
        <option value="">Select Status</option>
        <option value="Present">Present</option>
        <option value="Absent">Absent</option>
      </select>

      <br /><br />

      <button onClick={handleSubmit}>
        Submit
      </button>

    </div>
  );
}

export default MarkAttendance;
