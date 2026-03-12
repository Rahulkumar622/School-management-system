const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("School Management System API Running ✅");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});


// ================= STUDENT =================

// Add Student
app.post("/add-student", (req, res) => {
  const { name, className, section, roll_no, email, password } = req.body;

  const sql =
    "INSERT INTO students (name, class, section, roll_no, email, password) VALUES (?, ?, ?, ?, ?, ?)";

  db.query(
    sql,
    [name, className, section, roll_no, email, password],
    (err) => {
      if (err) {
        console.log(err);
        return res.send("Error adding student ❌");
      }

      res.send("Student Added Successfully ✅");
    }
  );
});


// Student Login
app.post("/student-login", (req, res) => {
  const { email, password } = req.body;

  const sql =
    "SELECT * FROM students WHERE email=? AND password=?";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      return res.json({
        success: false,
        message: "Server Error ❌",
      });
    }

    if (result.length > 0) {
      res.json({
        success: true,
        student: result[0],
      });
    } else {
      res.json({
        success: false,
        message: "Invalid Email or Password ❌",
      });
    }
  });
});



// ================= TEACHER =================

// Teacher Login
app.post("/teacher-login", (req, res) => {
  const { email, password } = req.body;

  const sql =
    "SELECT * FROM teachers WHERE email=? AND password=?";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Login Error ❌");
    }

    if (result.length > 0) {
      res.send(result[0]);
    } else {
      res.send("Invalid Email or Password ❌");
    }
  });
});




// ================= ATTENDANCE =================

// Mark Attendance
app.post("/mark-attendance", (req, res) => {
  const { student_id, subject, date, status } = req.body;

  // 🔥 Fetch name from students table
  const getNameSql = "SELECT name FROM students WHERE id = ?";

  db.query(getNameSql, [student_id], (err, result) => {
    if (err) return res.send(err);

    const student_name = result[0].name;

    const insertSql = `
      INSERT INTO attendance
      (student_id, student_name, subject, date, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [student_id, student_name, subject, date, status],
      (err2) => {
        if (err2) return res.send(err2);

        res.send("Attendance Marked ✅");
      }
    );
  });
});


// View Attendance
app.get("/attendance", (req, res) => {

  const sql = "SELECT * FROM attendance";

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      res.send("Error fetching attendance");
    } else {
      res.send(result);
    }
  });
});


// ================= MARKS =================

// Upload Marks
app.post("/upload-marks", (req, res) => {

  const { student_id, student_name, subject, marks, year } = req.body;

  const sql = `
    INSERT INTO marks
    (student_id, student_name, subject, marks, year)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [student_id, student_name, subject, marks, year],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.send("Error uploading marks ❌");
      }

      res.send("Marks Uploaded ✅");
    }
  );
});


// View Marks
app.get("/marks", (req, res) => {

  const sql = `
    SELECT 
      marks.id,
      marks.student_id,
      students.name AS student_name,
      marks.subject,
      marks.marks,
      marks.year
    FROM marks
    JOIN students ON marks.student_id = students.id
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      res.send("Error fetching marks");
    } else {
      res.json(result);
    }
  });

});


app.post("/mark-attendance", (req, res) => {
  const { student_id, subject, date, status } = req.body;

  // 🔥 Fetch name from students table
  const getNameSql = "SELECT name FROM students WHERE id = ?";

  db.query(getNameSql, [student_id], (err, result) => {
    if (err) return res.send(err);

    const student_name = result[0].name;

    const insertSql = `
      INSERT INTO attendance
      (student_id, student_name, subject, date, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [student_id, student_name, subject, date, status],
      (err2) => {
        if (err2) return res.send(err2);

        res.send("Attendance Marked ✅");
      }
    );
  });
});


// ===============================
// Get Student by ID
// ===============================
app.get("/student/:id", (req, res) => {
  const id = req.params.id;

  const sql = "SELECT name FROM students WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Error fetching student");
    }

    if (result.length > 0) {
      res.send(result[0]);
    } else {
      res.send({});
    }
  });
});


// View All Students
app.get("/students", (req, res) => {
  const sql = "SELECT * FROM students";

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      res.send("Error fetching students");
    } else {
      res.send(result);
    }
  });
});