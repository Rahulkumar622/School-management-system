// // import React, { useState } from "react";
// // import axios from "axios";

// // function UpdateMarks() {
// //   const [rollNo, setRollNo] = useState("");
// //   const [subject, setSubject] = useState("");
// //   const [marks, setMarks] = useState("");

// //   const handleUpdate = async () => {
// //     try {
// //       await axios.post("http://localhost:5000/update-marks", {
// //         rollNo,
// //         subject,
// //         marks,
// //       });

// //       alert("Marks Updated Successfully ✅");
// //     } catch (error) {
// //       alert("Error updating marks ❌");
// //     }
// //   };

// //   return (
// //     <div style={{ padding: "20px" }}>
// //       <h2>Update Student Marks 📝</h2>

// //       <input
// //         type="text"
// //         placeholder="Roll No"
// //         onChange={(e) => setRollNo(e.target.value)}
// //       />
// //       <br /><br />

// //       <input
// //         type="text"
// //         placeholder="Subject"
// //         onChange={(e) => setSubject(e.target.value)}
// //       />
// //       <br /><br />

// //       <input
// //         type="number"
// //         placeholder="Marks"
// //         onChange={(e) => setMarks(e.target.value)}
// //       />
// //       <br /><br />

// //       <button onClick={handleUpdate}>Update Marks</button>
// //     </div>
// //   );
// // }

// // export default UpdateMarks; 




// import React, { useState } from "react";
// import axios from "axios";

// function UpdateMarks() {
//   const [id, setId] = useState("");
//   const [subject, setSubject] = useState("");
//   const [marks, setMarks] = useState("");

//   const handleSubmit = async () => {
//     try {
//       const res = await axios.post(
//         "http://localhost:5000/upload-marks",
//         {
//           student_id: id,
//           subject: subject,
//           marks: marks,
//           year: 2025,
//         }
//       );

//       alert(res.data);
//     } catch (error) {
//       console.log(error);
//       alert("Error updating marks ❌");
//     }
//   };

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Update Student Marks 📝</h2>

//       <input
//         placeholder="Student ID"
//         onChange={(e) => setId(e.target.value)}
//       />
//       <br /><br />

//       <input
//         placeholder="Subject"
//         onChange={(e) => setSubject(e.target.value)}
//       />
//       <br /><br />

//       <input
//         placeholder="Marks"
//         onChange={(e) => setMarks(e.target.value)}
//       />
//       <br /><br />

//       <button onClick={handleSubmit}>
//         Update Marks
//       </button>
//     </div>
//   );
// }

// export default UpdateMarks;


import { useState } from "react";
import axios from "axios";

function UploadMarks() {

  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [year, setYear] = useState("");

  // Auto Fetch Student
  const fetchStudent = (id) => {

    if (!id) return;

    axios
      .get(`http://localhost:5000/student/${id}`)
      .then((res) => {
        setStudentName(res.data.name);
      })
      .catch((err) => console.log(err));
  };

  // Submit Marks
  const handleSubmit = () => {

    const data = {
      student_id: studentId,
      student_name: studentName,
      subject: subject,
      marks: marks,
      year: year
    };

    axios
      .post("http://localhost:5000/upload-marks", data)
      .then(() => alert("Marks Uploaded ✅"))
      .catch((err) => console.log(err));
  };

  return (
    <div style={{ padding: "20px" }}>

      <h2>Upload Marks 📝</h2>

      <input
        placeholder="Student ID"
        onChange={(e) => {
          setStudentId(e.target.value);
          fetchStudent(e.target.value);
        }}
      />

      <br /><br />

      <input
        value={studentName}
        placeholder="Student Name"
        readOnly
      />

      <br /><br />

      <input
        placeholder="Subject"
        onChange={(e) => setSubject(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Marks"
        onChange={(e) => setMarks(e.target.value)}
      />

      <br /><br />

      <input
        placeholder="Year"
        onChange={(e) => setYear(e.target.value)}
      />

      <br /><br />

      <button onClick={handleSubmit}>
        Submit
      </button>

    </div>
  );
}

export default UploadMarks;
