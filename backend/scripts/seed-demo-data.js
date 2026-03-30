const crypto = require("crypto");

const mysql = require("mysql2/promise");
const { buildDatabaseConfig } = require("../databaseConfig");

const PASSWORD_HASH_PREFIX = "s2$";
const DEMO = {
  school: {
    code: "DPS001",
    name: "Demo Public School",
    board: "CBSE",
    subscriptionStatus: "active",
    maxStudents: 500,
    softwareFee: 25000,
    softwarePaidAmount: 12000,
    contactEmail: "admin@demopublicschool.com",
    contactPhone: "9999999999",
    address: "Main Campus Road, Patna",
    lastPaymentDate: "2026-03-10",
  },
  owner: {
    email: "admin@gmail.com",
    password: "1234",
  },
  admin: {
    name: "Priya Sharma",
    email: "demo.admin@dps.local",
    password: "Demo@123",
  },
  teacher: {
    name: "Neha Verma",
    email: "demo.teacher@dps.local",
    password: "Demo@123",
  },
  parent: {
    name: "Rajesh Sharma",
    email: "demo.parent@dps.local",
    phone: "9876501234",
    password: "Demo@123",
  },
  student: {
    code: "DPS001-STU-101",
    name: "Aarav Sharma",
    email: "demo.student@dps.local",
    password: "Demo@123",
    className: "8",
    section: "A",
    rollNo: "14",
    annualFee: 18000,
    paidFee: 6000,
  },
  admission: {
    referenceNumber: "ADM-DPS001-DEMO01",
    previousSchool: "Green Valley School",
    notes: "Interested in transport facility and science club activities.",
  },
};

const scryptAsync = (password, salt) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(String(password), salt);
  return `${PASSWORD_HASH_PREFIX}${salt}$${derivedKey.toString("hex")}`;
};

const buildSchoolBillingValues = (softwareFee, softwarePaidAmount) => {
  const totalFee = Number(softwareFee || 0);
  const paidAmount = Number(softwarePaidAmount || 0);
  const dueAmount = Math.max(totalFee - paidAmount, 0);

  let feeStatus = "not_set";

  if (totalFee > 0) {
    if (dueAmount === 0) {
      feeStatus = "paid";
    } else if (paidAmount > 0) {
      feeStatus = "partial";
    } else {
      feeStatus = "unpaid";
    }
  }

  return {
    dueAmount,
    feeStatus,
  };
};

const installmentRows = [
  ["Apr Installment", 1500, 1500, "2026-04-10", "paid"],
  ["May Installment", 1500, 1500, "2026-05-10", "paid"],
  ["Jun Installment", 1500, 1500, "2026-06-10", "paid"],
  ["Jul Installment", 1500, 1500, "2026-07-10", "paid"],
  ["Aug Installment", 1500, 0, "2026-08-10", "pending"],
  ["Sep Installment", 1500, 0, "2026-09-10", "pending"],
  ["Oct Installment", 1500, 0, "2026-10-10", "pending"],
  ["Nov Installment", 1500, 0, "2026-11-10", "pending"],
  ["Dec Installment", 1500, 0, "2026-12-10", "pending"],
  ["Jan Installment", 1500, 0, "2027-01-10", "pending"],
  ["Feb Installment", 1500, 0, "2027-02-10", "pending"],
  ["Mar Installment", 1500, 0, "2027-03-10", "pending"],
];

const marksRows = [
  ["English", 88, "2026"],
  ["Mathematics", 92, "2026"],
  ["Science", 84, "2026"],
  ["Computer", 90, "2026"],
];

const attendanceRows = [
  ["English", "2026-03-17", "Present"],
  ["Mathematics", "2026-03-18", "Present"],
  ["Science", "2026-03-19", "Absent"],
  ["Computer", "2026-03-20", "Present"],
  ["English", "2026-03-21", "Present"],
];

const paymentRows = [
  [3000, "dummy-upi", "DPS001-DEMO-PAY-001", "paid", "Demo payment via parent portal", "2026-02-05 10:00:00"],
  [3000, "dummy-upi", "DPS001-DEMO-PAY-002", "paid", "Demo payment via student portal", "2026-03-05 10:00:00"],
];

const createConnection = async () =>
  mysql.createConnection(buildDatabaseConfig());

const ensureSchool = async (connection) => {
  const { dueAmount, feeStatus } = buildSchoolBillingValues(
    DEMO.school.softwareFee,
    DEMO.school.softwarePaidAmount
  );
  const [schools] = await connection.query("SELECT id FROM schools WHERE code = ? LIMIT 1", [
    DEMO.school.code,
  ]);

  if (schools.length === 0) {
    const [result] = await connection.query(
      `INSERT INTO schools
        (name, code, board, plan_name, subscription_status, max_students, subscription_start_date, subscription_end_date, software_fee, software_paid_amount, software_due_amount, software_fee_status, last_payment_date, contact_email, contact_phone, address)
       VALUES (?, ?, ?, 'Free', ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEMO.school.name,
        DEMO.school.code,
        DEMO.school.board,
        DEMO.school.subscriptionStatus,
        DEMO.school.maxStudents,
        "2026-03-01",
        DEMO.school.softwareFee,
        DEMO.school.softwarePaidAmount,
        dueAmount,
        feeStatus,
        DEMO.school.lastPaymentDate,
        DEMO.school.contactEmail,
        DEMO.school.contactPhone,
        DEMO.school.address,
      ]
    );

    return result.insertId;
  }

  await connection.query(
    `UPDATE schools
     SET
       name = ?,
       board = ?,
       subscription_status = ?,
       max_students = ?,
       software_fee = ?,
       software_paid_amount = ?,
       software_due_amount = ?,
       software_fee_status = ?,
       last_payment_date = ?,
       contact_email = ?,
       contact_phone = ?,
       address = ?
     WHERE id = ?`,
    [
      DEMO.school.name,
      DEMO.school.board,
      DEMO.school.subscriptionStatus,
      DEMO.school.maxStudents,
      DEMO.school.softwareFee,
      DEMO.school.softwarePaidAmount,
      dueAmount,
      feeStatus,
      DEMO.school.lastPaymentDate,
      DEMO.school.contactEmail,
      DEMO.school.contactPhone,
      DEMO.school.address,
      schools[0].id,
    ]
  );

  return schools[0].id;
};

const ensureAdmin = async (connection, schoolId) => {
  const [admins] = await connection.query(
    "SELECT id FROM admin_users WHERE school_id = ? AND email = ? AND role = 'school_admin' LIMIT 1",
    [schoolId, DEMO.admin.email]
  );
  const password = await hashPassword(DEMO.admin.password);

  if (admins.length === 0) {
    await connection.query(
      "INSERT INTO admin_users (school_id, name, email, password, role) VALUES (?, ?, ?, ?, 'school_admin')",
      [schoolId, DEMO.admin.name, DEMO.admin.email, password]
    );
    return;
  }

  await connection.query(
    "UPDATE admin_users SET name = ?, password = ? WHERE id = ?",
    [DEMO.admin.name, password, admins[0].id]
  );
};

const ensureTeacher = async (connection, schoolId) => {
  const [teachers] = await connection.query(
    "SELECT id FROM teachers WHERE school_id = ? AND email = ? LIMIT 1",
    [schoolId, DEMO.teacher.email]
  );
  const password = await hashPassword(DEMO.teacher.password);

  if (teachers.length === 0) {
    await connection.query(
      "INSERT INTO teachers (school_id, name, email, password) VALUES (?, ?, ?, ?)",
      [schoolId, DEMO.teacher.name, DEMO.teacher.email, password]
    );
    return;
  }

  await connection.query(
    "UPDATE teachers SET name = ?, password = ? WHERE id = ?",
    [DEMO.teacher.name, password, teachers[0].id]
  );
};

const ensureParent = async (connection, schoolId) => {
  const [parents] = await connection.query(
    "SELECT id FROM parents WHERE school_id = ? AND email = ? LIMIT 1",
    [schoolId, DEMO.parent.email]
  );
  const password = await hashPassword(DEMO.parent.password);

  if (parents.length === 0) {
    const [result] = await connection.query(
      "INSERT INTO parents (school_id, name, email, phone, password) VALUES (?, ?, ?, ?, ?)",
      [schoolId, DEMO.parent.name, DEMO.parent.email, DEMO.parent.phone, password]
    );
    return result.insertId;
  }

  await connection.query(
    "UPDATE parents SET name = ?, phone = ?, password = ? WHERE id = ?",
    [DEMO.parent.name, DEMO.parent.phone, password, parents[0].id]
  );

  return parents[0].id;
};

const ensureAdmission = async (connection, schoolId, parentId) => {
  const [admissions] = await connection.query(
    "SELECT id FROM admissions WHERE reference_number = ? LIMIT 1",
    [DEMO.admission.referenceNumber]
  );

  if (admissions.length === 0) {
    await connection.query(
      `INSERT INTO admissions
        (school_id, parent_id, student_name, class_name, previous_school, status, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)`,
      [
        schoolId,
        parentId,
        DEMO.student.name,
        DEMO.student.className,
        DEMO.admission.previousSchool,
        DEMO.admission.referenceNumber,
        DEMO.admission.notes,
      ]
    );
    return;
  }

  await connection.query(
    `UPDATE admissions
     SET school_id = ?, parent_id = ?, student_name = ?, class_name = ?, previous_school = ?, status = 'submitted', notes = ?
     WHERE id = ?`,
    [
      schoolId,
      parentId,
      DEMO.student.name,
      DEMO.student.className,
      DEMO.admission.previousSchool,
      DEMO.admission.notes,
      admissions[0].id,
    ]
  );
};

const ensureStudent = async (connection, schoolId, parentId) => {
  const annualFee = DEMO.student.annualFee;
  const paidFee = DEMO.student.paidFee;
  const dueFee = annualFee - paidFee;
  const [students] = await connection.query(
    "SELECT id FROM students WHERE school_id = ? AND email = ? LIMIT 1",
    [schoolId, DEMO.student.email]
  );
  const password = await hashPassword(DEMO.student.password);

  let studentId = students[0]?.id;

  if (!studentId) {
    const [result] = await connection.query(
      `INSERT INTO students
        (school_id, parent_id, student_code, name, class, section, roll_no, email, password, annual_fee, paid_fee, due_fee, fee_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'partial')`,
      [
        schoolId,
        parentId,
        DEMO.student.code,
        DEMO.student.name,
        DEMO.student.className,
        DEMO.student.section,
        DEMO.student.rollNo,
        DEMO.student.email,
        password,
        annualFee,
        paidFee,
        dueFee,
      ]
    );
    studentId = result.insertId;
  } else {
    await connection.query(
      `UPDATE students
       SET
         parent_id = ?,
         student_code = ?,
         name = ?,
         class = ?,
         section = ?,
         roll_no = ?,
         email = ?,
         password = ?,
         annual_fee = ?,
         paid_fee = ?,
         due_fee = ?,
         fee_status = 'partial'
       WHERE id = ?`,
      [
        parentId,
        DEMO.student.code,
        DEMO.student.name,
        DEMO.student.className,
        DEMO.student.section,
        DEMO.student.rollNo,
        DEMO.student.email,
        password,
        annualFee,
        paidFee,
        dueFee,
        studentId,
      ]
    );
  }

  return studentId;
};

const resetStudentRecords = async (connection, schoolId, studentId) => {
  await connection.query("DELETE FROM attendance WHERE school_id = ? AND student_id = ?", [
    schoolId,
    studentId,
  ]);
  await connection.query("DELETE FROM marks WHERE school_id = ? AND student_id = ?", [
    schoolId,
    studentId,
  ]);
  await connection.query("DELETE FROM fee_payments WHERE school_id = ? AND student_id = ?", [
    schoolId,
    studentId,
  ]);
  await connection.query("DELETE FROM fee_installments WHERE school_id = ? AND student_id = ?", [
    schoolId,
    studentId,
  ]);
};

const seedStudentRecords = async (connection, schoolId, studentId) => {
  for (const [label, amountDue, amountPaid, dueDate, status] of installmentRows) {
    await connection.query(
      `INSERT INTO fee_installments
        (school_id, student_id, installment_label, amount_due, amount_paid, due_date, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [schoolId, studentId, label, amountDue, amountPaid, dueDate, status]
    );
  }

  for (const [amount, method, reference, status, notes, paidAt] of paymentRows) {
    await connection.query(
      `INSERT INTO fee_payments
        (school_id, student_id, student_name, amount, payment_method, transaction_ref, status, notes, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [schoolId, studentId, DEMO.student.name, amount, method, reference, status, notes, paidAt]
    );
  }

  for (const [subject, marks, year] of marksRows) {
    await connection.query(
      "INSERT INTO marks (school_id, student_id, student_name, subject, marks, year) VALUES (?, ?, ?, ?, ?, ?)",
      [schoolId, studentId, DEMO.student.name, subject, marks, year]
    );
  }

  for (const [subject, date, status] of attendanceRows) {
    await connection.query(
      "INSERT INTO attendance (school_id, student_id, student_name, subject, date, status) VALUES (?, ?, ?, ?, ?, ?)",
      [schoolId, studentId, DEMO.student.name, subject, date, status]
    );
  }
};

const main = async () => {
  const connection = await createConnection();

  try {
    const schoolId = await ensureSchool(connection);
    await ensureAdmin(connection, schoolId);
    await ensureTeacher(connection, schoolId);
    const parentId = await ensureParent(connection, schoolId);
    await ensureAdmission(connection, schoolId, parentId);
    const studentId = await ensureStudent(connection, schoolId, parentId);
    await resetStudentRecords(connection, schoolId, studentId);
    await seedStudentRecords(connection, schoolId, studentId);

    console.log("Demo data ready.");
    console.log("");
    console.log(`School code: ${DEMO.school.code}`);
    console.log(`Software owner: ${DEMO.owner.email} / ${DEMO.owner.password}`);
    console.log(`School admin: ${DEMO.admin.email} / ${DEMO.admin.password}`);
    console.log(`Teacher: ${DEMO.teacher.email} / ${DEMO.teacher.password}`);
    console.log(`Parent: ${DEMO.parent.email} / ${DEMO.parent.password}`);
    console.log(`Student: ${DEMO.student.email} / ${DEMO.student.password}`);
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error("Failed to seed demo data");
  console.error(error);
  process.exit(1);
});
