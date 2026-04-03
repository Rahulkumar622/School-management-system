const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const SUPER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
const PASSWORD_HASH_PREFIX = "s2$";
const frontendBuildPath = path.join(__dirname, "..", "frontend", "build");
const allowedOrigins = String(process.env.CLIENT_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const resolveCorsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Not allowed by CORS"));
};

app.use(
  cors({
    origin: resolveCorsOrigin,
  })
);


app.use(express.json());


const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(results);
    });
  });

const asyncHandler = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const requireFields = (body, fields) =>
  fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

const normalizeIdentifier = (value) => String(value || "").trim();

const normalizeEmail = (value) => normalizeIdentifier(value).toLowerCase();

const normalizeStudentCode = (value) => normalizeIdentifier(value).toUpperCase();

const normalizeClassName = (value) => normalizeIdentifier(value);

const normalizeAudience = (value) => {
  const normalized = normalizeIdentifier(value).toLowerCase();

  if (["all", "parents", "teachers", "class"].includes(normalized)) {
    return normalized;
  }

  return "all";
};

const normalizeDayOfWeek = (value) => {
  const normalized = normalizeIdentifier(value).toLowerCase();
  const allowedDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  if (!allowedDays.includes(normalized)) {
    return "";
  }

  return normalized;
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

const isHashedPassword = (value) =>
  typeof value === "string" && value.startsWith(PASSWORD_HASH_PREFIX);

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(String(password), salt);
  return `${PASSWORD_HASH_PREFIX}${salt}$${derivedKey.toString("hex")}`;
};

const verifyPassword = async (storedPassword, plainPassword) => {
  if (!storedPassword) {
    return false;
  }

  if (!isHashedPassword(storedPassword)) {
    return storedPassword === plainPassword;
  }

  const hashBody = storedPassword.slice(PASSWORD_HASH_PREFIX.length);
  const [salt, hash] = hashBody.split("$");

  if (!salt || !hash) {
    return false;
  }

  const storedBuffer = Buffer.from(hash, "hex");
  const derivedKey = await scryptAsync(String(plainPassword), salt);

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
};

const upgradePasswordIfNeeded = async (tableName, userId, storedPassword, plainPassword) => {
  if (isHashedPassword(storedPassword) || storedPassword !== plainPassword) {
    return;
  }

  const nextPassword = await hashPassword(plainPassword);
  await query(`UPDATE ${tableName} SET password = ? WHERE id = ?`, [nextPassword, userId]);
};

const toStudentPayload = (student) => ({
  id: student.id,
  student_code: student.student_code || "",
  school_id: student.school_id,
  school_name: student.school_name,
  school_code: student.school_code,
  parent_id: student.parent_id || null,
  parent_name: student.parent_name || "",
  parent_email: student.parent_email || "",
  parent_phone: student.parent_phone || "",
  name: student.name,
  class: student.class,
  section: student.section,
  roll_no: student.roll_no,
  email: student.email,
  annual_fee: Number(student.annual_fee || 0),
  paid_fee: Number(student.paid_fee || 0),
  due_fee: Number(student.due_fee || 0),
  fee_status: student.fee_status || "unpaid",
});

const toTeacherPayload = (teacher) => ({
  id: teacher.id,
  school_id: teacher.school_id,
  school_name: teacher.school_name,
  school_code: teacher.school_code,
  name: teacher.name,
  email: teacher.email,
  assigned_class: teacher.assigned_class || "",
  assigned_subject: teacher.assigned_subject || "",
});

const toAdminPayload = (admin) => ({
  id: admin.id,
  school_id: admin.school_id,
  school_name: admin.school_name,
  school_code: admin.school_code,
  plan_name: admin.plan_name || "",
  subscription_status: admin.subscription_status || "active",
  subscription_end_date: admin.subscription_end_date || null,
  name: admin.name,
  email: admin.email,
  role: admin.role,
});

const toParentPayload = (parent) => ({
  id: parent.id,
  school_id: parent.school_id,
  school_name: parent.school_name,
  school_code: parent.school_code,
  name: parent.name,
  email: parent.email,
  phone: parent.phone,
});

const ensureColumn = async (tableName, columnName, definition) => {
  const columns = await query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  if (columns.length === 0) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const generateStudentCode = async (school) => {
  const schoolCode = String(school.code || "SCH").trim().toUpperCase();
  const studentCounts = await query(
    "SELECT COUNT(*) AS total FROM students WHERE school_id = ?",
    [school.id]
  );

  const nextNumber = Number(studentCounts[0]?.total || 0) + 1;
  return `${schoolCode}-STU-${String(nextNumber).padStart(3, "0")}`;
};

const backfillStudentCodes = async () => {
  const schools = await getSchools();

  for (const school of schools) {
    const students = await query(
      `SELECT id, student_code
       FROM students
       WHERE school_id = ?
       ORDER BY id ASC`,
      [school.id]
    );

    let sequence = 1;

    for (const student of students) {
      const expectedCode = `${String(school.code || "SCH").trim().toUpperCase()}-STU-${String(
        sequence
      ).padStart(3, "0")}`;

      if (!student.student_code || !String(student.student_code).trim()) {
        await query(
          "UPDATE students SET student_code = ? WHERE id = ?",
          [expectedCode, student.id]
        );
      }

      sequence += 1;
    }
  }
};

const createInstallmentsForStudent = async (studentId, schoolId, annualFee) => {
  const totalAnnualFee = Number(annualFee || 0);

  if (!Number.isFinite(totalAnnualFee) || totalAnnualFee <= 0) {
    return;
  }

  const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const baseAmount = Math.floor((totalAnnualFee / 12) * 100) / 100;
  let remaining = totalAnnualFee;

  for (let index = 0; index < monthNames.length; index += 1) {
    const amount = index === monthNames.length - 1 ? Number(remaining.toFixed(2)) : baseAmount;
    remaining -= amount;

    await query(
      `INSERT INTO fee_installments
        (school_id, student_id, installment_label, amount_due, amount_paid, due_date, status)
       VALUES (?, ?, ?, ?, 0, ?, 'pending')`,
      [
        schoolId,
        studentId,
        `${monthNames[index]} Installment`,
        amount,
        `2026-${String((index % 12) + 1).padStart(2, "0")}-10`,
      ]
    );
  }
};

const applyPaymentToInstallments = async (studentId, schoolId, amount) => {
  const installments = await query(
    `SELECT id, amount_due, amount_paid
     FROM fee_installments
     WHERE student_id = ? AND status <> 'paid'
     ORDER BY due_date ASC, id ASC`,
    [studentId]
  );

  let remaining = Number(amount);

  for (const installment of installments) {
    if (remaining <= 0) {
      break;
    }

    const due = Number(installment.amount_due) - Number(installment.amount_paid);
    if (due <= 0) {
      continue;
    }

    const credit = Math.min(due, remaining);
    const nextPaid = Number(installment.amount_paid) + credit;
    const status = nextPaid >= Number(installment.amount_due) ? "paid" : "partial";

    await query(
      `UPDATE fee_installments
       SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND school_id = ?`,
      [nextPaid, status, installment.id, schoolId]
    );

    remaining -= credit;
  }
};

const syncInstallmentsWithPaidAmount = async (studentId, schoolId, paidAmount) => {
  const installments = await query(
    `SELECT id, amount_due
     FROM fee_installments
     WHERE student_id = ? AND school_id = ?
     ORDER BY due_date ASC, id ASC`,
    [studentId, schoolId]
  );

  let remaining = normalizeCurrencyAmount(paidAmount);

  for (const installment of installments) {
    const amountDue = Number(installment.amount_due || 0);
    const amountPaid = Math.min(amountDue, remaining);
    const status = amountPaid <= 0 ? "pending" : amountPaid >= amountDue ? "paid" : "partial";

    await query(
      `UPDATE fee_installments
       SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND school_id = ?`,
      [amountPaid, status, installment.id, schoolId]
    );

    remaining = Math.max(remaining - amountPaid, 0);
  }
};

const deriveStudentFeeState = (annualFee, paidFee) => {
  const normalizedAnnualFee = normalizeCurrencyAmount(annualFee);
  const normalizedPaidFee = Math.min(normalizeCurrencyAmount(paidFee), normalizedAnnualFee);
  const dueFee = Number(Math.max(normalizedAnnualFee - normalizedPaidFee, 0).toFixed(2));
  const feeStatus =
    dueFee === 0 ? "paid" : normalizedPaidFee > 0 ? "partial" : "unpaid";

  return {
    annual_fee: normalizedAnnualFee,
    paid_fee: normalizedPaidFee,
    due_fee: dueFee,
    fee_status: feeStatus,
  };
};

const ensureClassCatalogEntry = async (schoolId, schoolCode, className) => {
  const normalizedClassName = normalizeClassName(className);

  if (!schoolId || !normalizedClassName) {
    return null;
  }

  const existingClasses = await query(
    `SELECT id
     FROM classes
     WHERE school_id = ? AND class_name = ?
     LIMIT 1`,
    [schoolId, normalizedClassName]
  );

  if (existingClasses.length > 0) {
    return existingClasses[0];
  }

  const result = await query(
    `INSERT INTO classes (school_id, school_code, class_name)
     VALUES (?, ?, ?)`,
    [schoolId, normalizeStudentCode(schoolCode), normalizedClassName]
  );

  return {
    id: result.insertId,
  };
};

const backfillClassCatalog = async () => {
  const classRows = await query(
    `SELECT DISTINCT school_id, school_code, class_name
     FROM (
       SELECT students.school_id AS school_id, schools.code AS school_code, students.class AS class_name
       FROM students
       JOIN schools ON schools.id = students.school_id
       WHERE students.school_id IS NOT NULL AND TRIM(COALESCE(students.class, '')) <> ''
       UNION
       SELECT admissions.school_id AS school_id, COALESCE(NULLIF(admissions.school_code, ''), schools.code) AS school_code, admissions.class_name AS class_name
       FROM admissions
       JOIN schools ON schools.id = admissions.school_id
       WHERE admissions.school_id IS NOT NULL AND TRIM(COALESCE(admissions.class_name, '')) <> ''
       UNION
       SELECT teachers.school_id AS school_id, schools.code AS school_code, teachers.assigned_class AS class_name
       FROM teachers
       JOIN schools ON schools.id = teachers.school_id
       WHERE teachers.school_id IS NOT NULL AND TRIM(COALESCE(teachers.assigned_class, '')) <> ''
     ) class_catalog`
  );

  for (const classRow of classRows) {
    await ensureClassCatalogEntry(classRow.school_id, classRow.school_code, classRow.class_name);
  }
};

const loadStudentFeeSnapshot = async (studentId) => {
  const students = await query(
    `SELECT id, school_id, name, annual_fee, paid_fee, due_fee, fee_status
     FROM students
     WHERE id = ?
     LIMIT 1`,
    [studentId]
  );

  if (students.length === 0) {
    return null;
  }

  const installments = await query(
    `SELECT id, installment_label, amount_due, amount_paid, due_date, status
     FROM fee_installments
     WHERE student_id = ?
     ORDER BY due_date ASC, id ASC`,
    [studentId]
  );

  return {
    fee: {
      ...students[0],
      annual_fee: Number(students[0].annual_fee || 0),
      paid_fee: Number(students[0].paid_fee || 0),
      due_fee: Number(students[0].due_fee || 0),
    },
    installments: installments.map((installment) => ({
      ...installment,
      amount_due: Number(installment.amount_due || 0),
      amount_paid: Number(installment.amount_paid || 0),
    })),
  };
};

const bootstrapDatabase = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS schools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      board VARCHAR(100) DEFAULT '',
      plan_name VARCHAR(60) NOT NULL DEFAULT 'Free',
      subscription_status VARCHAR(20) NOT NULL DEFAULT 'active',
      max_students INT NOT NULL DEFAULT 500,
      subscription_start_date DATE NULL,
      subscription_end_date DATE NULL,
      contact_email VARCHAR(120) DEFAULT '',
      contact_phone VARCHAR(30) DEFAULT '',
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS parents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(120) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      password VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      parent_id INT NULL,
      name VARCHAR(150) NOT NULL,
      class VARCHAR(50) NOT NULL,
      section VARCHAR(20) NOT NULL,
      roll_no VARCHAR(30) NOT NULL,
      email VARCHAR(120) NOT NULL,
      password VARCHAR(120) NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(120) NOT NULL,
      password VARCHAR(120) NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS classes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      school_code VARCHAR(50) NOT NULL,
      class_name VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_school_class (school_id, class_name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(120) NOT NULL,
      password VARCHAR(120) NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'school_admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS admissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      parent_id INT NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      class_name VARCHAR(50) NOT NULL,
      previous_school VARCHAR(150) DEFAULT '',
      status VARCHAR(30) NOT NULL DEFAULT 'submitted',
      reference_number VARCHAR(80) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      student_id INT NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS marks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      student_id INT NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      marks DECIMAL(5,2) NOT NULL,
      year VARCHAR(10) NOT NULL
    )
  `);

  await ensureColumn("students", "school_id", "INT NULL");
  await ensureColumn("students", "parent_id", "INT NULL");
  await ensureColumn("students", "student_code", "VARCHAR(80) NOT NULL DEFAULT ''");
  await ensureColumn("students", "annual_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("students", "paid_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("students", "due_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("students", "fee_status", "VARCHAR(20) NOT NULL DEFAULT 'unpaid'");
  await ensureColumn("schools", "plan_name", "VARCHAR(60) NOT NULL DEFAULT 'Free'");
  await ensureColumn("schools", "subscription_status", "VARCHAR(20) NOT NULL DEFAULT 'active'");
  await ensureColumn("schools", "max_students", "INT NOT NULL DEFAULT 500");
  await ensureColumn("schools", "subscription_start_date", "DATE NULL");
  await ensureColumn("schools", "subscription_end_date", "DATE NULL");
  await ensureColumn("schools", "software_fee", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("schools", "software_paid_amount", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("schools", "software_due_amount", "DECIMAL(10,2) NOT NULL DEFAULT 0");
  await ensureColumn("schools", "software_fee_status", "VARCHAR(20) NOT NULL DEFAULT 'not_set'");
  await ensureColumn("schools", "last_payment_date", "DATE NULL");
  await query("UPDATE schools SET plan_name = 'Free' WHERE COALESCE(plan_name, '') <> 'Free'");
  await query(
    "UPDATE schools SET subscription_end_date = NULL WHERE COALESCE(plan_name, 'Free') = 'Free'"
  );
  await query(`
    UPDATE schools
    SET
      software_fee = COALESCE(software_fee, 0),
      software_paid_amount = COALESCE(software_paid_amount, 0),
      software_due_amount = GREATEST(COALESCE(software_fee, 0) - COALESCE(software_paid_amount, 0), 0),
      software_fee_status = CASE
        WHEN COALESCE(software_fee, 0) <= 0 AND COALESCE(software_paid_amount, 0) > 0 THEN 'paid'
        WHEN COALESCE(software_fee, 0) <= 0 THEN 'not_set'
        WHEN GREATEST(COALESCE(software_fee, 0) - COALESCE(software_paid_amount, 0), 0) = 0 THEN 'paid'
        WHEN COALESCE(software_paid_amount, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  `);

  await ensureColumn("teachers", "school_id", "INT NULL");
  await ensureColumn("teachers", "assigned_class", "VARCHAR(50) NOT NULL DEFAULT ''");
  await ensureColumn("teachers", "assigned_subject", "VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumn("admissions", "school_code", "VARCHAR(50) NOT NULL DEFAULT ''");

  await query(`
    UPDATE admissions
    JOIN schools ON schools.id = admissions.school_id
    SET admissions.school_code = schools.code
    WHERE TRIM(COALESCE(admissions.school_code, '')) = ''
  `);

  await ensureColumn("attendance", "school_id", "INT NULL");
  await ensureColumn("marks", "school_id", "INT NULL");

  await query(`
    CREATE TABLE IF NOT EXISTS fee_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      student_id INT NOT NULL,
      student_name VARCHAR(150) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'dummy-upi',
      transaction_ref VARCHAR(120) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'paid',
      notes VARCHAR(255) DEFAULT '',
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS fee_installments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      student_id INT NOT NULL,
      installment_label VARCHAR(100) NOT NULL,
      amount_due DECIMAL(10,2) NOT NULL,
      amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
      due_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      title VARCHAR(180) NOT NULL,
      message TEXT NOT NULL,
      audience VARCHAR(20) NOT NULL DEFAULT 'all',
      class_name VARCHAR(50) DEFAULT '',
      created_by VARCHAR(120) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS timetables (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NOT NULL,
      class_name VARCHAR(50) NOT NULL,
      day_of_week VARCHAR(10) NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      subject_name VARCHAR(120) NOT NULL,
      teacher_name VARCHAR(150) DEFAULT '',
      room_no VARCHAR(40) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      name VARCHAR(80) NOT NULL,
      description VARCHAR(255) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_school_role (school_id, name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      label VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_role_permission (role_id, permission_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school_id INT NULL,
      user_name VARCHAR(150) DEFAULT '',
      action VARCHAR(255) NOT NULL,
      module VARCHAR(80) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    INSERT IGNORE INTO permissions (name, label)
    VALUES
      ('manage_students', 'Manage Students'),
      ('manage_attendance', 'Manage Attendance'),
      ('manage_grades', 'Manage Grades'),
      ('manage_fees', 'Manage Fees'),
      ('manage_notifications', 'Manage Notifications'),
      ('manage_timetable', 'Manage Timetable'),
      ('manage_roles', 'Manage Roles')
  `);

  await query(`
    INSERT INTO roles (school_id, name, description)
    SELECT NULL, 'Admin', 'Full school management access'
    WHERE NOT EXISTS (
      SELECT 1 FROM roles WHERE school_id IS NULL AND name = 'Admin'
    )
  `);

  await query(`
    INSERT INTO roles (school_id, name, description)
    SELECT NULL, 'Teacher', 'Academic and attendance operations'
    WHERE NOT EXISTS (
      SELECT 1 FROM roles WHERE school_id IS NULL AND name = 'Teacher'
    )
  `);

  await query(`
    INSERT INTO roles (school_id, name, description)
    SELECT NULL, 'Office Staff', 'Fee, records, and front-office work'
    WHERE NOT EXISTS (
      SELECT 1 FROM roles WHERE school_id IS NULL AND name = 'Office Staff'
    )
  `);

  await query(`
    INSERT INTO roles (school_id, name, description)
    SELECT NULL, 'Parent', 'View-only child access'
    WHERE NOT EXISTS (
      SELECT 1 FROM roles WHERE school_id IS NULL AND name = 'Parent'
    )
  `);

  await query(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT roles.id, permissions.id
    FROM roles
    JOIN permissions
    WHERE roles.school_id IS NULL
      AND roles.name = 'Admin'
  `);

  await query(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT roles.id, permissions.id
    FROM roles
    JOIN permissions
    WHERE roles.school_id IS NULL
      AND roles.name = 'Teacher'
      AND permissions.name IN ('manage_attendance', 'manage_grades', 'manage_timetable')
  `);

  await query(`
    INSERT IGNORE INTO role_permissions (role_id, permission_id)
    SELECT roles.id, permissions.id
    FROM roles
    JOIN permissions
    WHERE roles.school_id IS NULL
      AND roles.name = 'Office Staff'
      AND permissions.name IN ('manage_students', 'manage_fees', 'manage_notifications')
  `);

  await backfillClassCatalog();
};

const getSchools = () =>
  query(
    `SELECT
       id,
       name,
       code,
       board,
       plan_name,
       subscription_status,
       max_students,
       subscription_start_date,
       subscription_end_date,
       software_fee,
       software_paid_amount,
       software_due_amount,
       software_fee_status,
       last_payment_date,
       contact_email,
       contact_phone,
       address,
       created_at
     FROM schools
     ORDER BY name ASC`
  );

const getSchoolById = async (schoolId) => {
  const schools = await query("SELECT * FROM schools WHERE id = ? LIMIT 1", [schoolId]);
  return schools[0] || null;
};

const getSchoolByCode = async (schoolCode) => {
  const schools = await query("SELECT * FROM schools WHERE code = ? LIMIT 1", [schoolCode]);
  return schools[0] || null;
};

const resolveSchoolFromPayload = async (payload = {}) => {
  const schoolId = payload.school_id || payload.schoolId || null;
  const schoolCode = normalizeStudentCode(payload.schoolCode || payload.school_code);

  if (schoolId) {
    return getSchoolById(schoolId);
  }

  if (schoolCode) {
    return getSchoolByCode(schoolCode);
  }

  return null;
};

const isSchoolSubscriptionActive = (school) => {
  if (!school) {
    return false;
  }

  const status = String(school.subscription_status || "active").trim().toLowerCase();
  const planName = String(school.plan_name || "Free").trim().toLowerCase();
  if (status === "inactive" || status === "suspended") {
    return false;
  }

  if (planName === "free") {
    return true;
  }

  if (!school.subscription_end_date) {
    return true;
  }

  const today = new Date().toISOString().slice(0, 10);
  return String(school.subscription_end_date).slice(0, 10) >= today;
};

const getSchoolAccessError = (school) => {
  const status = String(school?.subscription_status || "active").trim().toLowerCase();

  if (status === "inactive" || status === "suspended") {
    return "This school's access is inactive. Please contact the software owner.";
  }

  return "This school's subscription has expired. Please contact the software owner.";
};

const normalizeCurrencyAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Number(amount.toFixed(2));
};

const buildSchoolBillingValues = (payload = {}) => {
  const softwareFee = normalizeCurrencyAmount(payload.software_fee);
  const softwarePaidAmount = normalizeCurrencyAmount(payload.software_paid_amount);
  const softwareDueAmount = Number(Math.max(softwareFee - softwarePaidAmount, 0).toFixed(2));

  let softwareFeeStatus = "not_set";

  if (softwareFee > 0) {
    if (softwareDueAmount === 0) {
      softwareFeeStatus = "paid";
    } else if (softwarePaidAmount > 0) {
      softwareFeeStatus = "partial";
    } else {
      softwareFeeStatus = "unpaid";
    }
  } else if (softwarePaidAmount > 0) {
    softwareFeeStatus = "paid";
  }

  return {
    software_fee: softwareFee,
    software_paid_amount: softwarePaidAmount,
    software_due_amount: softwareDueAmount,
    software_fee_status: softwareFeeStatus,
    last_payment_date: payload.last_payment_date ? String(payload.last_payment_date).trim() : null,
  };
};

const buildSchoolFilter = (schoolId, alias = "") => {
  if (!schoolId) {
    return {
      clause: "",
      params: [],
    };
  }

  const prefix = alias ? `${alias}.` : "";
  return {
    clause: `WHERE ${prefix}school_id = ?`,
    params: [schoolId],
  };
};

const createAuditLog = async ({ schoolId = null, userName = "", action, module }) => {
  if (!normalizeIdentifier(action) || !normalizeIdentifier(module)) {
    return;
  }

  await query(
    `INSERT INTO audit_logs (school_id, user_name, action, module)
     VALUES (?, ?, ?, ?)`,
    [schoolId, normalizeIdentifier(userName), normalizeIdentifier(action), normalizeIdentifier(module)]
  );
};

const findStudentByIdentifier = async (identifier, schoolCode = "") => {
  const normalizedSchoolCode = normalizeStudentCode(schoolCode);
  const students = await query(
    `SELECT
       students.id,
       students.student_code,
       students.school_id,
       students.parent_id,
       students.name,
       students.class,
       students.section,
       students.roll_no,
       students.email,
       students.annual_fee,
       students.paid_fee,
       students.due_fee,
       students.fee_status,
       parents.name AS parent_name,
       parents.email AS parent_email,
       parents.phone AS parent_phone,
       schools.name AS school_name,
       schools.code AS school_code
     FROM students
     LEFT JOIN parents ON parents.id = students.parent_id
     LEFT JOIN schools ON schools.id = students.school_id
     WHERE (students.id = ? OR students.student_code = ?)
       AND (? = '' OR schools.code = ?)
     LIMIT 1`,
    [identifier, String(identifier).trim().toUpperCase(), normalizedSchoolCode, normalizedSchoolCode]
  );

  return students[0] || null;
};

const findStudentLoginCandidates = async (schoolCode, identifier) => {
  const normalizedEmail = normalizeEmail(identifier);
  const normalizedStudentCode = normalizeStudentCode(identifier);

  return query(
    `SELECT
       students.*,
       parents.name AS parent_name,
       parents.email AS parent_email,
       parents.phone AS parent_phone,
       schools.name AS school_name,
       schools.code AS school_code,
       schools.plan_name,
       schools.subscription_status,
       schools.subscription_end_date
     FROM students
     JOIN schools ON schools.id = students.school_id
     LEFT JOIN parents ON parents.id = students.parent_id
     WHERE schools.code = ?
       AND (
         LOWER(TRIM(students.email)) = ?
         OR UPPER(TRIM(students.student_code)) = ?
       )
     ORDER BY students.id DESC`,
    [normalizeStudentCode(schoolCode), normalizedEmail, normalizedStudentCode]
  );
};

const findLegacyStudentLoginCandidates = async (identifier) => {
  const normalizedEmail = normalizeEmail(identifier);
  const normalizedStudentCode = normalizeStudentCode(identifier);

  return query(
    `SELECT id, student_code, name, email, password
     FROM students
     WHERE school_id IS NULL
       AND (
         LOWER(TRIM(email)) = ?
         OR UPPER(TRIM(student_code)) = ?
       )
     ORDER BY id DESC`,
    [normalizedEmail, normalizedStudentCode]
  );
};

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "School Management System API running",
  });
});

app.get(
  "/schools",
  asyncHandler(async (req, res) => {
    const schools = await getSchools();

    res.json({
      success: true,
      schools,
    });
  })
);

app.post(
  "/schools",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["name", "code"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const {
      name,
      code,
      board = "",
      max_students = 500,
      subscription_status = "active",
      software_fee = 0,
      software_paid_amount = 0,
      last_payment_date = null,
      contact_email = "",
      contact_phone = "",
      address = "",
    } = req.body;
    const normalizedCode = code.trim().toUpperCase();
    const existingSchool = await getSchoolByCode(normalizedCode);

    if (existingSchool) {
      res.status(409).json({
        success: false,
        message: "School code already exists",
      });
      return;
    }

    const billing = buildSchoolBillingValues({
      software_fee,
      software_paid_amount,
      last_payment_date,
    });

    await query(
      `INSERT INTO schools
        (name, code, board, plan_name, subscription_status, max_students, subscription_start_date, subscription_end_date, software_fee, software_paid_amount, software_due_amount, software_fee_status, last_payment_date, contact_email, contact_phone, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        normalizedCode,
        board.trim(),
        "Free",
        String(subscription_status || "active").trim().toLowerCase(),
        Number(max_students) || 500,
        new Date().toISOString().slice(0, 10),
        null,
        billing.software_fee,
        billing.software_paid_amount,
        billing.software_due_amount,
        billing.software_fee_status,
        billing.last_payment_date,
        contact_email.trim(),
        contact_phone.trim(),
        address.trim(),
      ]
    );

    res.status(201).json({
      success: true,
      message: "School created successfully",
      schools: await getSchools(),
    });
  })
);

app.patch(
  "/schools/:id",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["name", "code"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const school = await getSchoolById(req.params.id);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    const normalizedCode = req.body.code.trim().toUpperCase();
    const existingSchool = await getSchoolByCode(normalizedCode);

    if (existingSchool && Number(existingSchool.id) !== Number(school.id)) {
      res.status(409).json({
        success: false,
        message: "School code already exists",
      });
      return;
    }

    const billing = buildSchoolBillingValues(req.body);

    await query(
      `UPDATE schools
       SET
         name = ?,
         code = ?,
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
        req.body.name.trim(),
        normalizedCode,
        (req.body.board || "").trim(),
        String(req.body.subscription_status || "active").trim().toLowerCase(),
        Number(req.body.max_students) || 500,
        billing.software_fee,
        billing.software_paid_amount,
        billing.software_due_amount,
        billing.software_fee_status,
        billing.last_payment_date,
        (req.body.contact_email || "").trim(),
        (req.body.contact_phone || "").trim(),
        (req.body.address || "").trim(),
        school.id,
      ]
    );

    res.json({
      success: true,
      message: "School updated successfully",
      schools: await getSchools(),
    });
  })
);

app.delete(
  "/schools/:id",
  asyncHandler(async (req, res) => {
    const school = await getSchoolById(req.params.id);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    await query("DELETE FROM attendance WHERE school_id = ?", [school.id]);
    await query("DELETE FROM marks WHERE school_id = ?", [school.id]);
    await query("DELETE FROM fee_payments WHERE school_id = ?", [school.id]);
    await query("DELETE FROM fee_installments WHERE school_id = ?", [school.id]);
    await query("DELETE FROM admissions WHERE school_id = ?", [school.id]);
    await query("DELETE FROM students WHERE school_id = ?", [school.id]);
    await query("DELETE FROM parents WHERE school_id = ?", [school.id]);
    await query("DELETE FROM teachers WHERE school_id = ?", [school.id]);
    await query("DELETE FROM admin_users WHERE school_id = ?", [school.id]);
    await query("DELETE FROM schools WHERE id = ?", [school.id]);

    res.json({
      success: true,
      message: "School deleted successfully",
      schools: await getSchools(),
    });
  })
);

app.post(
  "/admin-login",
  asyncHandler(async (req, res) => {
    const requestedRole = String(req.body.role || "super_admin").trim().toLowerCase();
    const role = requestedRole === "principal" ? "school_admin" : requestedRole;
    const { schoolCode = "", email, password } = req.body;
    const missingFields = requireFields(req.body, ["email", "password"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    if (role === "super_admin") {
      if (email.trim() === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
        res.json({
          success: true,
          admin: {
            id: "super-admin",
            name: "Software Owner",
            email: SUPER_ADMIN_EMAIL,
            role: "super_admin",
          },
        });
        return;
      }

      res.status(401).json({
        success: false,
        message: "Invalid software owner credentials",
      });
      return;
    }

    if (!schoolCode.trim()) {
      res.status(400).json({
        success: false,
        message: "School code is required for school admin login",
      });
      return;
    }

    const admins = await query(
      `SELECT
         admin_users.*,
         schools.name AS school_name,
         schools.code AS school_code,
         schools.plan_name,
         schools.subscription_status,
         schools.subscription_end_date
       FROM admin_users
       JOIN schools ON schools.id = admin_users.school_id
       WHERE admin_users.role = 'school_admin'
         AND schools.code = ?
         AND admin_users.email = ?
       LIMIT 1`,
      [schoolCode.trim().toUpperCase(), email.trim()]
    );

    if (admins.length === 0 || !(await verifyPassword(admins[0].password, password))) {
      res.status(401).json({
        success: false,
        message: "Invalid school admin credentials",
      });
      return;
    }

    if (!isSchoolSubscriptionActive(admins[0])) {
      res.status(403).json({
        success: false,
        message: getSchoolAccessError(admins[0]),
      });
      return;
    }

    await upgradePasswordIfNeeded("admin_users", admins[0].id, admins[0].password, password);

    res.json({
      success: true,
      admin: toAdminPayload(admins[0]),
    });
  })
);

app.post(
  "/admin-users",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["school_id", "name", "email", "password"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const school = await getSchoolById(req.body.school_id);
    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    await query(
      `INSERT INTO admin_users (school_id, name, email, password, role)
       VALUES (?, ?, ?, ?, 'school_admin')`,
      [
        school.id,
        req.body.name.trim(),
        req.body.email.trim(),
        await hashPassword(req.body.password),
      ]
    );

    res.status(201).json({
      success: true,
      message: "School admin created successfully",
    });
  })
);

app.get(
  "/admin-users",
  asyncHandler(async (req, res) => {
    const schoolFilter = buildSchoolFilter(req.query.schoolId, "admin_users");
    const admins = await query(
      `SELECT
         admin_users.id,
         admin_users.name,
         admin_users.email,
         admin_users.role,
         schools.name AS school_name,
         schools.code AS school_code
       FROM admin_users
       LEFT JOIN schools ON schools.id = admin_users.school_id
       ${schoolFilter.clause}
       ORDER BY admin_users.id DESC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      admins,
    });
  })
);

app.get(
  "/owner/dashboard",
  asyncHandler(async (req, res) => {
    const [
      schoolCounts,
      activeSchoolCounts,
      studentCounts,
      teacherCounts,
      adminCounts,
      admissionCounts,
      billingSummary,
    ] = await Promise.all([
      query("SELECT COUNT(*) AS total FROM schools"),
      query(
        `SELECT COUNT(*) AS total
         FROM schools
         WHERE subscription_status NOT IN ('inactive', 'suspended')`
      ),
      query("SELECT COUNT(*) AS total FROM students"),
      query("SELECT COUNT(*) AS total FROM teachers"),
      query("SELECT COUNT(*) AS total FROM admin_users WHERE role = 'school_admin'"),
      query("SELECT COUNT(*) AS total FROM admissions"),
      query(
        `SELECT
           SUM(CASE WHEN software_fee_status = 'paid' THEN 1 ELSE 0 END) AS paid_schools,
           SUM(CASE WHEN software_due_amount > 0 THEN 1 ELSE 0 END) AS pending_fee_schools,
           COALESCE(SUM(software_paid_amount), 0) AS collected_amount,
           COALESCE(SUM(software_due_amount), 0) AS due_amount
         FROM schools`
      ),
    ]);

    res.json({
      success: true,
      stats: {
        schools: Number(schoolCounts[0]?.total || 0),
        active_schools: Number(activeSchoolCounts[0]?.total || 0),
        students: Number(studentCounts[0]?.total || 0),
        teachers: Number(teacherCounts[0]?.total || 0),
        school_admins: Number(adminCounts[0]?.total || 0),
        admissions: Number(admissionCounts[0]?.total || 0),
        paid_schools: Number(billingSummary[0]?.paid_schools || 0),
        pending_fee_schools: Number(billingSummary[0]?.pending_fee_schools || 0),
        collected_amount: Number(billingSummary[0]?.collected_amount || 0),
        due_amount: Number(billingSummary[0]?.due_amount || 0),
      },
    });
  })
);

app.get(
  "/schools/:id/dashboard",
  asyncHandler(async (req, res) => {
    const school = await getSchoolById(req.params.id);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    const [studentCounts, teacherCounts, feeSummary, admissionCounts, classCounts] = await Promise.all([
      query("SELECT COUNT(*) AS total FROM students WHERE school_id = ?", [school.id]),
      query("SELECT COUNT(*) AS total FROM teachers WHERE school_id = ?", [school.id]),
      query(
        `SELECT
          COALESCE(SUM(annual_fee), 0) AS annual_fee,
          COALESCE(SUM(paid_fee), 0) AS paid_fee,
          COALESCE(SUM(due_fee), 0) AS due_fee,
          SUM(CASE WHEN fee_status = 'paid' THEN 1 ELSE 0 END) AS paid_students,
          SUM(CASE WHEN fee_status = 'partial' THEN 1 ELSE 0 END) AS partial_students,
          SUM(CASE WHEN fee_status <> 'paid' THEN 1 ELSE 0 END) AS unpaid_students
        FROM students
        WHERE school_id = ?`,
        [school.id]
      ),
      query("SELECT COUNT(*) AS total FROM admissions WHERE school_id = ?", [school.id]),
      query("SELECT COUNT(*) AS total FROM classes WHERE school_id = ?", [school.id]),
    ]);

    res.json({
      success: true,
      school,
      stats: {
        students: Number(studentCounts[0]?.total || 0),
        teachers: Number(teacherCounts[0]?.total || 0),
        classes: Number(classCounts[0]?.total || 0),
        admissions: Number(admissionCounts[0]?.total || 0),
        annual_fee: Number(feeSummary[0]?.annual_fee || 0),
        paid_fee: Number(feeSummary[0]?.paid_fee || 0),
        due_fee: Number(feeSummary[0]?.due_fee || 0),
        paid_students: Number(feeSummary[0]?.paid_students || 0),
        partial_students: Number(feeSummary[0]?.partial_students || 0),
        unpaid_students: Number(feeSummary[0]?.unpaid_students || 0),
      },
    });
  })
);

app.post(
  "/add-student",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, [
      "school_id",
      "name",
      "className",
      "section",
      "roll_no",
      "email",
      "password",
      "annual_fee",
    ]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const {
      school_id,
      name,
      className,
      section,
      roll_no,
      email,
      password,
      annual_fee,
    } = req.body;

    const school = await getSchoolById(school_id);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    const annualFee = Number(annual_fee);
    const existingStudent = await query(
      `SELECT id
       FROM students
       WHERE school_id = ? AND LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [school.id, normalizeEmail(email)]
    );

    if (existingStudent.length > 0) {
      res.status(409).json({
        success: false,
        message: "A student with this email already exists in the selected school",
      });
      return;
    }

    const studentCode = await generateStudentCode(school);
    await ensureClassCatalogEntry(school.id, school.code, className);

    const insertResult = await query(
      `INSERT INTO students
        (school_id, parent_id, student_code, name, class, section, roll_no, email, password, annual_fee, paid_fee, due_fee, fee_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid')`,
      [
        school.id,
        req.body.parent_id || null,
        studentCode,
        name.trim(),
        className.trim(),
        section.trim(),
        roll_no,
        email.trim(),
        await hashPassword(password),
        annualFee,
        annualFee,
      ]
    );

    await createInstallmentsForStudent(insertResult.insertId, school.id, annualFee);

    res.status(201).json({
      success: true,
      message: "Student added successfully",
      student_code: studentCode,
    });
  })
);

app.post(
  "/add-teacher",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, [
      "name",
      "email",
      "password",
    ]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    if (!req.body.school_id && !normalizeStudentCode(req.body.schoolCode || req.body.school_code)) {
      res.status(400).json({
        success: false,
        message: "school_id or schoolCode is required",
      });
      return;
    }

    const { name, email, password } = req.body;
    const assignedClass = normalizeClassName(req.body.assigned_class);
    const assignedSubject = normalizeIdentifier(req.body.assigned_subject);
    const school = await resolveSchoolFromPayload(req.body);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    const existingTeacher = await query(
      `SELECT id
       FROM teachers
       WHERE school_id = ? AND LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [school.id, normalizeEmail(email)]
    );

    if (existingTeacher.length > 0) {
      res.status(409).json({
        success: false,
        message: "A teacher with this email already exists in the selected school",
      });
      return;
    }

    if (assignedClass) {
      await ensureClassCatalogEntry(school.id, school.code, assignedClass);
    }

    await query(
      `INSERT INTO teachers (school_id, name, email, password, assigned_class, assigned_subject)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        school.id,
        name.trim(),
        email.trim(),
        await hashPassword(password),
        assignedClass,
        assignedSubject,
      ]
    );

    await createAuditLog({
      schoolId: school.id,
      userName: req.body.created_by || req.body.createdBy || "School Admin",
      action: `Created teacher ${name.trim()}`,
      module: "Teachers",
    });

    res.status(201).json({
      success: true,
      message: "Teacher added successfully",
    });
  })
);

app.get(
  "/teachers",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          teachers: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const schoolFilter = buildSchoolFilter(schoolId, "teachers");
    const teachers = await query(
      `SELECT
         teachers.id,
         teachers.school_id,
         teachers.name,
         teachers.email,
         teachers.assigned_class,
         teachers.assigned_subject,
         schools.name AS school_name,
         schools.code AS school_code
       FROM teachers
       LEFT JOIN schools ON schools.id = teachers.school_id
       ${schoolFilter.clause}
       ORDER BY teachers.name ASC, teachers.id DESC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      teachers: teachers.map(toTeacherPayload),
    });
  })
);

app.patch(
  "/teachers/:id",
  asyncHandler(async (req, res) => {
    const teachers = await query(
      `SELECT
         teachers.id,
         teachers.school_id,
         teachers.name,
         teachers.email,
         teachers.password,
         teachers.assigned_class,
         teachers.assigned_subject,
         schools.name AS school_name,
         schools.code AS school_code
       FROM teachers
       LEFT JOIN schools ON schools.id = teachers.school_id
       WHERE teachers.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (teachers.length === 0) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
      return;
    }

    const teacher = teachers[0];
    const nextName = normalizeIdentifier(req.body.name || teacher.name);
    const nextEmail = normalizeIdentifier(req.body.email || teacher.email);
    const nextAssignedClass = normalizeClassName(
      req.body.assigned_class !== undefined ? req.body.assigned_class : teacher.assigned_class
    );
    const nextAssignedSubject = normalizeIdentifier(
      req.body.assigned_subject !== undefined ? req.body.assigned_subject : teacher.assigned_subject
    );

    if (!nextName || !nextEmail) {
      res.status(400).json({
        success: false,
        message: "Teacher name and email are required",
      });
      return;
    }

    const existingTeacher = await query(
      `SELECT id
       FROM teachers
       WHERE school_id = ? AND LOWER(TRIM(email)) = ? AND id <> ?
       LIMIT 1`,
      [teacher.school_id, normalizeEmail(nextEmail), teacher.id]
    );

    if (existingTeacher.length > 0) {
      res.status(409).json({
        success: false,
        message: "Another teacher with this email already exists in the selected school",
      });
      return;
    }

    if (nextAssignedClass) {
      await ensureClassCatalogEntry(teacher.school_id, teacher.school_code, nextAssignedClass);
    }

    const nextPassword = req.body.password
      ? await hashPassword(req.body.password)
      : teacher.password;

    await query(
      `UPDATE teachers
       SET name = ?, email = ?, password = ?, assigned_class = ?, assigned_subject = ?
       WHERE id = ?`,
      [nextName, nextEmail, nextPassword, nextAssignedClass, nextAssignedSubject, teacher.id]
    );

    await createAuditLog({
      schoolId: teacher.school_id,
      userName: req.body.updated_by || req.body.updatedBy || "School Admin",
      action: `Updated teacher ${nextName}`,
      module: "Teachers",
    });

    const updatedTeachers = await query(
      `SELECT
         teachers.id,
         teachers.school_id,
         teachers.name,
         teachers.email,
         teachers.assigned_class,
         teachers.assigned_subject,
         schools.name AS school_name,
         schools.code AS school_code
       FROM teachers
       LEFT JOIN schools ON schools.id = teachers.school_id
       WHERE teachers.id = ?
       LIMIT 1`,
      [teacher.id]
    );

    res.json({
      success: true,
      message: "Teacher updated successfully",
      teacher: toTeacherPayload(updatedTeachers[0]),
    });
  })
);

app.get(
  "/classes",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          classes: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const schoolFilter = buildSchoolFilter(schoolId, "classes");
    const classes = await query(
      `SELECT
         classes.id,
         classes.school_id,
         classes.school_code,
         classes.class_name,
         schools.name AS school_name
       FROM classes
       LEFT JOIN schools ON schools.id = classes.school_id
       ${schoolFilter.clause}
       ORDER BY CAST(classes.class_name AS UNSIGNED) ASC, classes.class_name ASC, classes.id ASC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      classes,
    });
  })
);

app.post(
  "/classes",
  asyncHandler(async (req, res) => {
    const school = await resolveSchoolFromPayload(req.body);
    const className = normalizeClassName(req.body.class_name);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    if (!className) {
      res.status(400).json({
        success: false,
        message: "Class name is required",
      });
      return;
    }

    await ensureClassCatalogEntry(school.id, school.code, className);

    await createAuditLog({
      schoolId: school.id,
      userName: req.body.created_by || req.body.createdBy || "School Admin",
      action: `Created class ${className}`,
      module: "Classes",
    });

    const classes = await query(
      `SELECT id, school_id, school_code, class_name
       FROM classes
       WHERE school_id = ?
       ORDER BY CAST(class_name AS UNSIGNED) ASC, class_name ASC, id ASC`,
      [school.id]
    );

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      classes,
    });
  })
);

app.get(
  "/timetables",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          timetables: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const params = [];
    const conditions = [];

    if (schoolId) {
      conditions.push("school_id = ?");
      params.push(schoolId);
    }

    if (req.query.className && normalizeClassName(req.query.className)) {
      conditions.push("class_name = ?");
      params.push(normalizeClassName(req.query.className));
    }

    if (req.query.dayOfWeek && normalizeDayOfWeek(req.query.dayOfWeek)) {
      conditions.push("day_of_week = ?");
      params.push(normalizeDayOfWeek(req.query.dayOfWeek));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const timetables = await query(
      `SELECT
         id,
         school_id,
         class_name,
         day_of_week,
         start_time,
         end_time,
         subject_name,
         teacher_name,
         room_no
       FROM timetables
       ${whereClause}
       ORDER BY FIELD(day_of_week, 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'), start_time ASC, id ASC`,
      params
    );

    res.json({
      success: true,
      timetables,
    });
  })
);

app.post(
  "/timetables",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, [
      "class_name",
      "day_of_week",
      "start_time",
      "end_time",
      "subject_name",
    ]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const school = await resolveSchoolFromPayload(req.body);
    const dayOfWeek = normalizeDayOfWeek(req.body.day_of_week);
    const className = normalizeClassName(req.body.class_name);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    if (!dayOfWeek) {
      res.status(400).json({
        success: false,
        message: "day_of_week must be one of mon, tue, wed, thu, fri, sat, sun",
      });
      return;
    }

    await query(
      `INSERT INTO timetables
        (school_id, class_name, day_of_week, start_time, end_time, subject_name, teacher_name, room_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        school.id,
        className,
        dayOfWeek,
        normalizeIdentifier(req.body.start_time),
        normalizeIdentifier(req.body.end_time),
        normalizeIdentifier(req.body.subject_name),
        normalizeIdentifier(req.body.teacher_name),
        normalizeIdentifier(req.body.room_no),
      ]
    );

    await createAuditLog({
      schoolId: school.id,
      userName: req.body.created_by || req.body.createdBy || "School Admin",
      action: `Created timetable slot for class ${className} on ${dayOfWeek}`,
      module: "Timetable",
    });

    res.status(201).json({
      success: true,
      message: "Timetable entry created successfully",
    });
  })
);

app.patch(
  "/timetables/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM timetables WHERE id = ? LIMIT 1", [req.params.id]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Timetable entry not found",
      });
      return;
    }

    const row = rows[0];
    const nextDay = normalizeDayOfWeek(req.body.day_of_week || row.day_of_week);
    const nextClass = normalizeClassName(req.body.class_name || row.class_name);
    const nextStart = normalizeIdentifier(req.body.start_time || row.start_time);
    const nextEnd = normalizeIdentifier(req.body.end_time || row.end_time);
    const nextSubject = normalizeIdentifier(req.body.subject_name || row.subject_name);
    const nextTeacher = normalizeIdentifier(
      req.body.teacher_name !== undefined ? req.body.teacher_name : row.teacher_name
    );
    const nextRoom = normalizeIdentifier(req.body.room_no !== undefined ? req.body.room_no : row.room_no);

    if (!nextClass || !nextDay || !nextStart || !nextEnd || !nextSubject) {
      res.status(400).json({
        success: false,
        message: "Class, day, time, and subject are required",
      });
      return;
    }

    await query(
      `UPDATE timetables
       SET class_name = ?, day_of_week = ?, start_time = ?, end_time = ?, subject_name = ?, teacher_name = ?, room_no = ?
       WHERE id = ?`,
      [nextClass, nextDay, nextStart, nextEnd, nextSubject, nextTeacher, nextRoom, row.id]
    );

    await createAuditLog({
      schoolId: row.school_id,
      userName: req.body.updated_by || req.body.updatedBy || "School Admin",
      action: `Updated timetable slot ${row.id}`,
      module: "Timetable",
    });

    res.json({
      success: true,
      message: "Timetable entry updated successfully",
    });
  })
);

app.delete(
  "/timetables/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM timetables WHERE id = ? LIMIT 1", [req.params.id]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Timetable entry not found",
      });
      return;
    }

    await query("DELETE FROM timetables WHERE id = ?", [req.params.id]);

    await createAuditLog({
      schoolId: rows[0].school_id,
      userName: req.body?.deleted_by || req.query.deleted_by || "School Admin",
      action: `Deleted timetable slot ${req.params.id}`,
      module: "Timetable",
    });

    res.json({
      success: true,
      message: "Timetable entry deleted successfully",
    });
  })
);

app.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          notifications: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const params = [];
    const conditions = [];

    if (schoolId) {
      conditions.push("school_id = ?");
      params.push(schoolId);
    }

    if (req.query.audience && normalizeAudience(req.query.audience)) {
      conditions.push("audience = ?");
      params.push(normalizeAudience(req.query.audience));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const notifications = await query(
      `SELECT
         id,
         school_id,
         title,
         message,
         audience,
         class_name,
         created_by,
         created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC, id DESC`,
      params
    );

    res.json({
      success: true,
      notifications,
    });
  })
);

app.post(
  "/notifications",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["title", "message"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const school = await resolveSchoolFromPayload(req.body);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    const audience = normalizeAudience(req.body.audience);
    const className = audience === "class" ? normalizeClassName(req.body.class_name) : "";

    if (audience === "class" && !className) {
      res.status(400).json({
        success: false,
        message: "class_name is required when audience is class",
      });
      return;
    }

    await query(
      `INSERT INTO notifications
        (school_id, title, message, audience, class_name, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        school.id,
        normalizeIdentifier(req.body.title),
        normalizeIdentifier(req.body.message),
        audience,
        className,
        normalizeIdentifier(req.body.created_by || req.body.createdBy),
      ]
    );

    await createAuditLog({
      schoolId: school.id,
      userName: req.body.created_by || req.body.createdBy || "School Admin",
      action: `Published notification ${normalizeIdentifier(req.body.title)}`,
      module: "Notifications",
    });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
    });
  })
);

app.patch(
  "/notifications/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM notifications WHERE id = ? LIMIT 1", [req.params.id]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    const row = rows[0];
    const nextTitle = normalizeIdentifier(req.body.title || row.title);
    const nextMessage = normalizeIdentifier(req.body.message || row.message);
    const nextAudience = normalizeAudience(req.body.audience || row.audience);
    const nextClassName =
      nextAudience === "class"
        ? normalizeClassName(req.body.class_name !== undefined ? req.body.class_name : row.class_name)
        : "";

    if (!nextTitle || !nextMessage) {
      res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
      return;
    }

    if (nextAudience === "class" && !nextClassName) {
      res.status(400).json({
        success: false,
        message: "class_name is required when audience is class",
      });
      return;
    }

    await query(
      `UPDATE notifications
       SET title = ?, message = ?, audience = ?, class_name = ?
       WHERE id = ?`,
      [nextTitle, nextMessage, nextAudience, nextClassName, row.id]
    );

    await createAuditLog({
      schoolId: row.school_id,
      userName: req.body.updated_by || req.body.updatedBy || "School Admin",
      action: `Updated notification ${row.id}`,
      module: "Notifications",
    });

    res.json({
      success: true,
      message: "Notification updated successfully",
    });
  })
);

app.delete(
  "/notifications/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM notifications WHERE id = ? LIMIT 1", [req.params.id]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    await query("DELETE FROM notifications WHERE id = ?", [req.params.id]);

    await createAuditLog({
      schoolId: rows[0].school_id,
      userName: req.body?.deleted_by || req.query.deleted_by || "School Admin",
      action: `Deleted notification ${req.params.id}`,
      module: "Notifications",
    });

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  })
);

app.get(
  "/roles",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          roles: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const roles = await query(
      `SELECT
         roles.id,
         roles.school_id,
         roles.name,
         roles.description,
         GROUP_CONCAT(permissions.name ORDER BY permissions.name SEPARATOR ',') AS permission_names,
         GROUP_CONCAT(permissions.label ORDER BY permissions.name SEPARATOR ',') AS permission_labels
       FROM roles
       LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
       LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
       WHERE roles.school_id IS NULL OR roles.school_id = ?
       GROUP BY roles.id, roles.school_id, roles.name, roles.description
       ORDER BY roles.school_id IS NULL DESC, roles.name ASC`,
      [schoolId || 0]
    );

    res.json({
      success: true,
      roles: roles.map((role) => ({
        id: role.id,
        school_id: role.school_id,
        name: role.name,
        description: role.description || "",
        permissions: normalizeIdentifier(role.permission_names)
          ? String(role.permission_names).split(",").filter(Boolean)
          : [],
        permission_labels: normalizeIdentifier(role.permission_labels)
          ? String(role.permission_labels).split(",").filter(Boolean)
          : [],
      })),
    });
  })
);

app.get(
  "/permissions",
  asyncHandler(async (req, res) => {
    const permissions = await query(
      "SELECT id, name, label FROM permissions ORDER BY label ASC"
    );

    res.json({
      success: true,
      permissions,
    });
  })
);

app.post(
  "/roles",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["name"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const school = await resolveSchoolFromPayload(req.body);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    const roleName = normalizeIdentifier(req.body.name);
    const roleDescription = normalizeIdentifier(req.body.description);
    const requestedPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];

    const existingRoles = await query(
      "SELECT id FROM roles WHERE school_id = ? AND name = ? LIMIT 1",
      [school.id, roleName]
    );

    let roleId = existingRoles[0]?.id || null;

    if (roleId) {
      await query("UPDATE roles SET description = ? WHERE id = ?", [roleDescription, roleId]);
      await query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
    } else {
      const roleInsert = await query(
        "INSERT INTO roles (school_id, name, description) VALUES (?, ?, ?)",
        [school.id, roleName, roleDescription]
      );
      roleId = roleInsert.insertId;
    }

    if (requestedPermissions.length > 0) {
      const normalizedPermissions = requestedPermissions
        .map((permission) => normalizeIdentifier(permission))
        .filter(Boolean);

      const permissionRows = normalizedPermissions.length
        ? await query(
            `SELECT id, name
             FROM permissions
             WHERE name IN (?)`,
            [normalizedPermissions]
          )
        : [];

      for (const permission of permissionRows) {
        await query(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [roleId, permission.id]
        );
      }
    }

    await createAuditLog({
      schoolId: school.id,
      userName: req.body.created_by || req.body.createdBy || "School Admin",
      action: `${existingRoles[0]?.id ? "Updated" : "Created"} role ${roleName}`,
      module: "Roles",
    });

    res.status(201).json({
      success: true,
      message: "Role saved successfully",
      role_id: roleId,
    });
  })
);

app.delete(
  "/roles/:id",
  asyncHandler(async (req, res) => {
    const rows = await query("SELECT * FROM roles WHERE id = ? LIMIT 1", [req.params.id]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Role not found",
      });
      return;
    }

    const role = rows[0];

    if (role.school_id === null) {
      res.status(400).json({
        success: false,
        message: "Default roles cannot be deleted",
      });
      return;
    }

    await query("DELETE FROM role_permissions WHERE role_id = ?", [role.id]);
    await query("DELETE FROM roles WHERE id = ?", [role.id]);

    await createAuditLog({
      schoolId: role.school_id,
      userName: req.body?.deleted_by || req.query.deleted_by || "School Admin",
      action: `Deleted role ${role.name}`,
      module: "Roles",
    });

    res.json({
      success: true,
      message: "Role deleted successfully",
    });
  })
);

app.post(
  "/classes/bootstrap",
  asyncHandler(async (req, res) => {
    const school = await resolveSchoolFromPayload(req.body);

    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
      await ensureClassCatalogEntry(school.id, school.code, String(classNumber));
    }

    await createAuditLog({
      schoolId: school.id,
      userName: req.body.created_by || req.body.createdBy || "School Admin",
      action: "Bootstrapped classes 1 to 12",
      module: "Classes",
    });

    const classes = await query(
      `SELECT id, school_id, school_code, class_name
       FROM classes
       WHERE school_id = ?
       ORDER BY CAST(class_name AS UNSIGNED) ASC, class_name ASC, id ASC`,
      [school.id]
    );

    res.json({
      success: true,
      message: "Classes 1 to 12 are ready for this school",
      classes,
    });
  })
);

app.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          audit_logs: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const schoolFilter = buildSchoolFilter(schoolId, "audit_logs");
    const auditLogs = await query(
      `SELECT
         id,
         school_id,
         user_name,
         action,
         module,
         timestamp
       FROM audit_logs
       ${schoolFilter.clause}
       ORDER BY timestamp DESC, id DESC
       LIMIT 100`,
      schoolFilter.params
    );

    res.json({
      success: true,
      audit_logs: auditLogs,
    });
  })
);

app.post(
  "/send-email",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["to", "subject", "body"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    res.json({
      success: true,
      mode: configured ? "configured-not-implemented" : "simulated",
      message: configured
        ? "SMTP credentials detected, but provider-specific delivery is not implemented in this build yet."
        : "Email request validated and recorded in simulated mode because SMTP is not configured.",
    });
  })
);

app.post(
  "/send-sms",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["to", "message"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const configured = Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_KEY);

    res.json({
      success: true,
      mode: configured ? "configured-not-implemented" : "simulated",
      message: configured
        ? "SMS provider credentials detected, but provider-specific delivery is not implemented in this build yet."
        : "SMS request validated and recorded in simulated mode because no SMS provider is configured.",
    });
  })
);

app.post(
  "/student-login",
  asyncHandler(async (req, res) => {
    const schoolCode = normalizeStudentCode(req.body.schoolCode);
    const identifier = normalizeIdentifier(req.body.identifier || req.body.email);
    const password = req.body.password;

    if (!schoolCode || !identifier || !String(password || "").trim()) {
      res.status(400).json({
        success: false,
        message: "School code, email or student code, and password are required",
      });
      return;
    }

    const students = await findStudentLoginCandidates(schoolCode, identifier);
    const matchingStudents = [];

    for (const student of students) {
      if (await verifyPassword(student.password, password)) {
        matchingStudents.push(student);
      }
    }

    if (matchingStudents.length === 0) {
      if (students.length === 0) {
        const legacyStudents = await findLegacyStudentLoginCandidates(identifier);

        for (const legacyStudent of legacyStudents) {
          if (await verifyPassword(legacyStudent.password, password)) {
            res.status(409).json({
              success: false,
              message:
                "This student account is missing a school link. Open the student record in admin and re-save it under the correct school before logging in.",
            });
            return;
          }
        }
      }

      res.status(401).json({
        success: false,
        message: "Invalid school code, email/student code or password",
      });
      return;
    }

    if (matchingStudents.length > 1) {
      res.status(409).json({
        success: false,
        message: "Multiple student accounts use this email. Please login with the generated student code instead.",
      });
      return;
    }

    const student = matchingStudents[0];

    if (!isSchoolSubscriptionActive(student)) {
      res.status(403).json({
        success: false,
        message: getSchoolAccessError(student),
      });
      return;
    }

    await upgradePasswordIfNeeded("students", student.id, student.password, password);

    res.json({
      success: true,
      message: "Login successful",
      student: toStudentPayload(student),
    });
  })
);

app.post(
  "/teacher-login",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["schoolCode", "email", "password"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "School code, email and password are required",
      });
      return;
    }

    const { schoolCode, email, password } = req.body;
    const teachers = await query(
      `SELECT
         teachers.*,
         schools.name AS school_name,
         schools.code AS school_code,
         schools.plan_name,
         schools.subscription_status,
         schools.subscription_end_date
       FROM teachers
       JOIN schools ON schools.id = teachers.school_id
       WHERE schools.code = ? AND teachers.email = ?
       LIMIT 1`,
      [schoolCode.trim().toUpperCase(), email.trim()]
    );

    if (teachers.length === 0 || !(await verifyPassword(teachers[0].password, password))) {
      res.status(401).json({
        success: false,
        message: "Invalid school code, email or password",
      });
      return;
    }

    if (!isSchoolSubscriptionActive(teachers[0])) {
      res.status(403).json({
        success: false,
        message: getSchoolAccessError(teachers[0]),
      });
      return;
    }

    await upgradePasswordIfNeeded("teachers", teachers[0].id, teachers[0].password, password);

    res.json({
      success: true,
      message: "Login successful",
      teacher: toTeacherPayload(teachers[0]),
    });
  })
);

app.post(
  "/parent-login",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["schoolCode", "email", "password"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "School code, email and password are required",
      });
      return;
    }

    const parents = await query(
      `SELECT
         parents.*,
         schools.name AS school_name,
         schools.code AS school_code,
         schools.plan_name,
         schools.subscription_status,
         schools.subscription_end_date
       FROM parents
       JOIN schools ON schools.id = parents.school_id
       WHERE schools.code = ? AND parents.email = ?
       LIMIT 1`,
      [req.body.schoolCode.trim().toUpperCase(), req.body.email.trim()]
    );

    if (parents.length === 0 || !(await verifyPassword(parents[0].password, req.body.password))) {
      res.status(401).json({
        success: false,
        message: "Invalid school code, email or password",
      });
      return;
    }

    if (!isSchoolSubscriptionActive(parents[0])) {
      res.status(403).json({
        success: false,
        message: getSchoolAccessError(parents[0]),
      });
      return;
    }

    await upgradePasswordIfNeeded("parents", parents[0].id, parents[0].password, req.body.password);

    res.json({
      success: true,
      parent: toParentPayload(parents[0]),
    });
  })
);

app.post(
  "/admissions",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, [
      "student_name",
      "class_name",
      "parent_name",
      "parent_email",
      "parent_phone",
      "parent_password",
    ]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    if (!req.body.school_id && !normalizeStudentCode(req.body.schoolCode || req.body.school_code)) {
      res.status(400).json({
        success: false,
        message: "school_id or schoolCode is required",
      });
      return;
    }

    const school = await resolveSchoolFromPayload(req.body);
    if (!school) {
      res.status(404).json({
        success: false,
        message: "School not found",
      });
      return;
    }

    let parentId = null;
    const existingParents = await query(
      "SELECT * FROM parents WHERE school_id = ? AND email = ? LIMIT 1",
      [school.id, req.body.parent_email.trim()]
    );

    if (existingParents.length > 0) {
      parentId = existingParents[0].id;
    } else {
      const parentInsert = await query(
        `INSERT INTO parents (school_id, name, email, phone, password)
         VALUES (?, ?, ?, ?, ?)`,
        [
          school.id,
          req.body.parent_name.trim(),
          req.body.parent_email.trim(),
          req.body.parent_phone.trim(),
          await hashPassword(req.body.parent_password),
        ]
      );
      parentId = parentInsert.insertId;
    }

    const referenceNumber = `ADM-${school.code}-${Date.now()}`;
    await query(
      `INSERT INTO admissions
        (school_id, school_code, parent_id, student_name, class_name, previous_school, status, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
      [
        school.id,
        school.code,
        parentId,
        req.body.student_name.trim(),
        req.body.class_name.trim(),
        (req.body.previous_school || "").trim(),
        referenceNumber,
        (req.body.notes || "").trim(),
      ]
    );

    await ensureClassCatalogEntry(school.id, school.code, req.body.class_name);

    res.status(201).json({
      success: true,
      message: "Admission form submitted successfully",
      reference_number: referenceNumber,
    });
  })
);

app.get(
  "/admissions",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));
      if (!school) {
        res.json({
          success: true,
          admissions: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const params = [];
    const conditions = [];

    if (schoolId) {
      conditions.push("admissions.school_id = ?");
      params.push(schoolId);
    }

    if (req.query.className && normalizeClassName(req.query.className)) {
      conditions.push("admissions.class_name = ?");
      params.push(normalizeClassName(req.query.className));
    }

    if (req.query.status && normalizeIdentifier(req.query.status)) {
      conditions.push("admissions.status = ?");
      params.push(normalizeIdentifier(req.query.status));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const admissions = await query(
      `SELECT
         admissions.id,
         admissions.school_id,
         COALESCE(NULLIF(admissions.school_code, ''), schools.code) AS school_code,
         admissions.student_name,
         admissions.class_name,
         admissions.previous_school,
         admissions.status,
         admissions.reference_number,
         admissions.created_at,
         parents.name AS parent_name,
         parents.email AS parent_email,
         parents.phone AS parent_phone,
         schools.name AS school_name
       FROM admissions
       LEFT JOIN parents ON parents.id = admissions.parent_id
       LEFT JOIN schools ON schools.id = admissions.school_id
       ${whereClause}
       ORDER BY admissions.id DESC`,
      params
    );

    res.json({
      success: true,
      admissions,
    });
  })
);

app.get(
  "/parents/:id/dashboard",
  asyncHandler(async (req, res) => {
    const parents = await query(
      `SELECT
         parents.*,
         schools.name AS school_name,
         schools.code AS school_code
       FROM parents
       LEFT JOIN schools ON schools.id = parents.school_id
       WHERE parents.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (parents.length === 0) {
      res.status(404).json({
        success: false,
        message: "Parent not found",
      });
      return;
    }

    const [admissions, children] = await Promise.all([
      query(
        `SELECT id, student_name, class_name, status, reference_number, created_at
         FROM admissions
         WHERE parent_id = ?
         ORDER BY id DESC`,
        [req.params.id]
      ),
        query(
          `SELECT
             students.id,
             students.student_code,
             students.name,
             students.class,
             students.section,
             students.annual_fee,
             students.paid_fee,
             students.due_fee,
             students.fee_status,
             (
               SELECT COALESCE(SUM(marks.marks), 0)
               FROM marks
               WHERE marks.student_id = students.id
             ) AS total_marks,
             (
               SELECT COUNT(*)
               FROM marks
               WHERE marks.student_id = students.id
             ) AS total_mark_entries,
             (
               SELECT COUNT(*)
               FROM attendance
               WHERE attendance.student_id = students.id
             ) AS total_attendance_entries,
             (
               SELECT COALESCE(SUM(CASE WHEN attendance.status = 'Present' THEN 1 ELSE 0 END), 0)
               FROM attendance
               WHERE attendance.student_id = students.id
             ) AS present_count
           FROM students
           WHERE parent_id = ?
           ORDER BY students.id DESC`,
          [req.params.id]
        ),
      ]);

    const childrenWithPerformance = await Promise.all(
      children.map(async (child) => {
        const subjectScores = await query(
          `SELECT subject, marks
           FROM marks
           WHERE student_id = ?
           ORDER BY id DESC`,
          [child.id]
        );

        const totalMarkEntries = Number(child.total_mark_entries || 0);
        const totalAttendanceEntries = Number(child.total_attendance_entries || 0);
        const presentCount = Number(child.present_count || 0);
        const totalMarks = Number(child.total_marks || 0);
        const percentage = totalMarkEntries
          ? Number(((totalMarks / (totalMarkEntries * 100)) * 100).toFixed(2))
          : 0;
        const attendancePercentage = totalAttendanceEntries
          ? Number(((presentCount / totalAttendanceEntries) * 100).toFixed(2))
          : 0;

        let grade = "F";
        if (percentage >= 90) grade = "A+";
        else if (percentage >= 80) grade = "A";
        else if (percentage >= 70) grade = "B";
        else if (percentage >= 60) grade = "C";
        else if (percentage >= 50) grade = "D";

        const topSubject = subjectScores.length
          ? subjectScores.reduce((best, current) =>
              Number(best.marks) > Number(current.marks) ? best : current
            )
          : null;

        return {
          ...child,
          annual_fee: Number(child.annual_fee || 0),
          paid_fee: Number(child.paid_fee || 0),
          due_fee: Number(child.due_fee || 0),
          total_marks: totalMarks,
          total_mark_entries: totalMarkEntries,
          total_attendance_entries: totalAttendanceEntries,
          present_count: presentCount,
          percentage,
          attendance_percentage: attendancePercentage,
          grade,
          top_subject: topSubject?.subject || "",
        };
      })
    );

    res.json({
      success: true,
      parent: toParentPayload(parents[0]),
      admissions,
      children: childrenWithPerformance,
    });
  })
);

app.post(
  "/mark-attendance",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["student_id", "subject", "date", "status"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const { student_id, subject, date, status } = req.body;
    const student = await findStudentByIdentifier(student_id);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    await query(
      `INSERT INTO attendance (school_id, student_id, student_name, subject, date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student.school_id, student.id, student.name, subject.trim(), date, status]
    );

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
    });
  })
);

app.get(
  "/attendance",
  asyncHandler(async (req, res) => {
    const schoolFilter = buildSchoolFilter(req.query.schoolId, "attendance");
    const attendance = await query(
      `SELECT
         attendance.id,
         attendance.student_id,
         attendance.student_name,
         attendance.subject,
         attendance.date,
         attendance.status,
         schools.name AS school_name
       FROM attendance
       LEFT JOIN schools ON schools.id = attendance.school_id
       ${schoolFilter.clause}
       ORDER BY attendance.date DESC, attendance.id DESC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      attendance,
    });
  })
);

app.post(
  "/upload-marks",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["student_id", "subject", "marks", "year"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const { student_id, subject, marks, year } = req.body;
    const student = await findStudentByIdentifier(student_id);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    await query(
      `INSERT INTO marks (school_id, student_id, student_name, subject, marks, year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student.school_id, student.id, student.name, subject.trim(), marks, year]
    );

    res.status(201).json({
      success: true,
      message: "Marks uploaded successfully",
    });
  })
);

app.get(
  "/marks",
  asyncHandler(async (req, res) => {
    const schoolFilter = buildSchoolFilter(req.query.schoolId, "marks");
    const marks = await query(
      `SELECT
         marks.id,
         marks.student_id,
         students.name AS student_name,
         marks.subject,
         marks.marks,
         marks.year,
         schools.name AS school_name
       FROM marks
       JOIN students ON marks.student_id = students.id
       LEFT JOIN schools ON schools.id = marks.school_id
       ${schoolFilter.clause}
       ORDER BY marks.year DESC, marks.id DESC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      marks,
    });
  })
);

app.get(
  "/parents",
  asyncHandler(async (req, res) => {
    const schoolFilter = buildSchoolFilter(req.query.schoolId, "parents");
    const parents = await query(
      `SELECT
         parents.id,
         parents.school_id,
         parents.name,
         parents.email,
         parents.phone,
         schools.name AS school_name,
         schools.code AS school_code,
         (
           SELECT COUNT(*)
           FROM students
           WHERE students.parent_id = parents.id
         ) AS linked_students
       FROM parents
       LEFT JOIN schools ON schools.id = parents.school_id
       ${schoolFilter.clause}
       ORDER BY parents.name ASC, parents.id DESC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      parents: parents.map((parent) => ({
        ...toParentPayload(parent),
        linked_students: Number(parent.linked_students || 0),
      })),
    });
  })
);

app.get(
  "/student/:id",
  asyncHandler(async (req, res) => {
    const student = await findStudentByIdentifier(req.params.id, req.query.schoolCode);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    res.json({
      success: true,
      student: toStudentPayload(student),
    });
  })
);

app.get(
  "/students",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));

      if (!school) {
        res.json({
          success: true,
          students: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const conditions = [];
    const params = [];

    if (schoolId) {
      conditions.push("students.school_id = ?");
      params.push(schoolId);
    }

    if (req.query.className && normalizeClassName(req.query.className)) {
      conditions.push("students.class = ?");
      params.push(normalizeClassName(req.query.className));
    }

    if (req.query.studentCode && normalizeStudentCode(req.query.studentCode)) {
      conditions.push("students.student_code = ?");
      params.push(normalizeStudentCode(req.query.studentCode));
    }

    if (req.query.feeStatus && normalizeIdentifier(req.query.feeStatus)) {
      conditions.push("students.fee_status = ?");
      params.push(normalizeIdentifier(req.query.feeStatus));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const students = await query(
      `SELECT
         students.id,
         students.school_id,
         students.parent_id,
         students.student_code,
         students.name,
         students.class,
         students.section,
         students.roll_no,
         students.email,
         students.annual_fee,
         students.paid_fee,
         students.due_fee,
         students.fee_status,
         parents.name AS parent_name,
         parents.email AS parent_email,
         parents.phone AS parent_phone,
         schools.name AS school_name,
         schools.code AS school_code
       FROM students
       LEFT JOIN parents ON parents.id = students.parent_id
       LEFT JOIN schools ON schools.id = students.school_id
       ${whereClause}
       ORDER BY students.id DESC`,
      params
    );

    res.json({
      success: true,
      students: students.map(toStudentPayload),
    });
  })
);

app.get(
  "/students/classroom",
  asyncHandler(async (req, res) => {
    const { schoolId, className, section, subject, date } = req.query;

    if (!schoolId || !className) {
      res.status(400).json({
        success: false,
        message: "School and class are required",
      });
      return;
    }

    const params = [schoolId, className];
    let sectionClause = "";

    if (section && String(section).trim()) {
      sectionClause = " AND students.section = ?";
      params.push(section);
    }

    const students = await query(
      `SELECT
         students.id,
         students.school_id,
         students.parent_id,
         students.student_code,
         students.name,
         students.class,
         students.section,
         students.roll_no,
         students.email,
         students.annual_fee,
         students.paid_fee,
         students.due_fee,
         students.fee_status,
         parents.name AS parent_name,
         parents.email AS parent_email,
         parents.phone AS parent_phone,
         schools.name AS school_name,
         schools.code AS school_code
       FROM students
       LEFT JOIN parents ON parents.id = students.parent_id
       LEFT JOIN schools ON schools.id = students.school_id
       WHERE students.school_id = ? AND students.class = ?${sectionClause}
       ORDER BY students.roll_no ASC, students.name ASC`,
      params
    );

    if (students.length === 0) {
      res.json({
        success: true,
        students: [],
      });
      return;
    }

    if (subject && date) {
      const attendanceRows = await query(
        `SELECT student_id, status
         FROM attendance
         WHERE school_id = ? AND subject = ? AND date = ? AND student_id IN (?)`,
        [schoolId, subject, date, students.map((student) => student.id)]
      );

      const attendanceMap = new Map(
        attendanceRows.map((row) => [String(row.student_id), row.status])
      );

      res.json({
        success: true,
        students: students.map((student) => ({
          ...toStudentPayload(student),
          attendance_status: attendanceMap.get(String(student.id)) || "Present",
        })),
      });
      return;
    }

    res.json({
      success: true,
      students: students.map(toStudentPayload),
    });
  })
);

app.patch(
  "/students/:id/link-parent",
  asyncHandler(async (req, res) => {
    if (req.body.parent_id === undefined) {
      res.status(400).json({
        success: false,
        message: "parent_id is required",
      });
      return;
    }

    const students = await query(
      `SELECT
         students.id,
         students.school_id,
         students.parent_id,
         students.student_code,
         students.name,
         students.class,
         students.section,
         students.roll_no,
         students.email,
         students.annual_fee,
         students.paid_fee,
         students.due_fee,
         students.fee_status,
         parents.name AS parent_name,
         parents.email AS parent_email,
         parents.phone AS parent_phone,
         schools.name AS school_name,
         schools.code AS school_code
       FROM students
       LEFT JOIN parents ON parents.id = students.parent_id
       LEFT JOIN schools ON schools.id = students.school_id
       WHERE students.id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (students.length === 0) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    const student = students[0];
    const nextParentId = req.body.parent_id ? Number(req.body.parent_id) : null;

    if (nextParentId) {
      const parents = await query(
        `SELECT
           parents.id,
           parents.school_id,
           parents.name,
           parents.email,
           parents.phone,
           schools.name AS school_name,
           schools.code AS school_code
         FROM parents
         LEFT JOIN schools ON schools.id = parents.school_id
         WHERE parents.id = ?
         LIMIT 1`,
        [nextParentId]
      );

      if (parents.length === 0) {
        res.status(404).json({
          success: false,
          message: "Parent not found",
        });
        return;
      }

      if (Number(parents[0].school_id) !== Number(student.school_id)) {
        res.status(400).json({
          success: false,
          message: "Student and parent must belong to the same school",
        });
        return;
      }
    }

    await query("UPDATE students SET parent_id = ? WHERE id = ?", [nextParentId, student.id]);

    const updatedStudents = await query(
      `SELECT
         students.id,
         students.school_id,
         students.parent_id,
         students.student_code,
         students.name,
         students.class,
         students.section,
         students.roll_no,
         students.email,
         students.annual_fee,
         students.paid_fee,
         students.due_fee,
         students.fee_status,
         parents.name AS parent_name,
         parents.email AS parent_email,
         parents.phone AS parent_phone,
         schools.name AS school_name,
         schools.code AS school_code
       FROM students
       LEFT JOIN parents ON parents.id = students.parent_id
       LEFT JOIN schools ON schools.id = students.school_id
       WHERE students.id = ?
       LIMIT 1`,
      [student.id]
    );

    res.json({
      success: true,
      message: nextParentId
        ? "Parent linked with student successfully"
        : "Parent unlinked from student successfully",
      student: toStudentPayload(updatedStudents[0]),
    });
  })
);

app.get(
  "/student-marks/:id",
  asyncHandler(async (req, res) => {
    const marks = await query(
      "SELECT id, subject, marks, year FROM marks WHERE student_id = ? ORDER BY year DESC, id DESC",
      [req.params.id]
    );

    res.json({
      success: true,
      marks,
    });
  })
);

app.get(
  "/student-attendance/:id",
  asyncHandler(async (req, res) => {
    const attendance = await query(
      "SELECT id, subject, date, status FROM attendance WHERE student_id = ? ORDER BY date DESC, id DESC",
      [req.params.id]
    );

    res.json({
      success: true,
      attendance,
    });
  })
);

app.get(
  "/student-fee/:id",
  asyncHandler(async (req, res) => {
    const student = await findStudentByIdentifier(req.params.id, req.query.schoolCode);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    const snapshot = await loadStudentFeeSnapshot(student.id);

    if (!snapshot) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    const payments = await query(
      `SELECT id, amount, payment_method, transaction_ref, status, notes, paid_at
       FROM fee_payments
       WHERE student_id = ?
       ORDER BY paid_at DESC, id DESC`,
      [student.id]
    );

    res.json({
      success: true,
      fee: snapshot.fee,
      installments: snapshot.installments,
      payments,
    });
  })
);

app.patch(
  "/students/:id/fee-status",
  asyncHandler(async (req, res) => {
    const nextStatus = String(req.body.fee_status || "").trim().toLowerCase();

    if (!["paid", "unpaid", "partial"].includes(nextStatus)) {
      res.status(400).json({
        success: false,
        message: "fee_status must be paid, unpaid, or partial",
      });
      return;
    }

    const student = await findStudentByIdentifier(
      req.params.id,
      req.body.schoolCode || req.query.schoolCode
    );

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    const annualFee = Number(student.annual_fee || 0);
    let nextPaidFee = Number(student.paid_fee || 0);

    if (nextStatus === "paid") {
      nextPaidFee = annualFee;
    } else if (nextStatus === "unpaid") {
      nextPaidFee = 0;
    } else {
      nextPaidFee = normalizeCurrencyAmount(req.body.paid_fee);

      if (nextPaidFee <= 0 || nextPaidFee >= annualFee) {
        res.status(400).json({
          success: false,
          message: "For partial status, paid_fee must be greater than 0 and less than annual fee",
        });
        return;
      }
    }

    const feeState = deriveStudentFeeState(annualFee, nextPaidFee);

    await query(
      `UPDATE students
       SET paid_fee = ?, due_fee = ?, fee_status = ?
       WHERE id = ?`,
      [feeState.paid_fee, feeState.due_fee, feeState.fee_status, student.id]
    );

    await syncInstallmentsWithPaidAmount(student.id, student.school_id, feeState.paid_fee);

    await createAuditLog({
      schoolId: student.school_id,
      userName: req.body.updated_by || req.body.updatedBy || "School Admin",
      action: `Updated fee status for student ${student.name} to ${feeState.fee_status}`,
      module: "Fees",
    });

    const updatedStudents = await query(
      `SELECT
         students.id,
         students.school_id,
         students.parent_id,
         students.student_code,
         students.name,
         students.class,
         students.section,
         students.roll_no,
         students.email,
         students.annual_fee,
         students.paid_fee,
         students.due_fee,
         students.fee_status,
         parents.name AS parent_name,
         parents.email AS parent_email,
         parents.phone AS parent_phone,
         schools.name AS school_name,
         schools.code AS school_code
       FROM students
       LEFT JOIN parents ON parents.id = students.parent_id
       LEFT JOIN schools ON schools.id = students.school_id
       WHERE students.id = ?
       LIMIT 1`,
      [student.id]
    );

    const snapshot = await loadStudentFeeSnapshot(student.id);

    res.json({
      success: true,
      message: "Payment status updated successfully",
      student: toStudentPayload(updatedStudents[0]),
      fee: snapshot?.fee || null,
      installments: snapshot?.installments || [],
    });
  })
);

app.post(
  "/students/:id/pay-fee",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["amount"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: "Payment amount is required",
      });
      return;
    }

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Enter a valid payment amount",
      });
      return;
    }

    const students = await query(
      `SELECT id, school_id, name, annual_fee, paid_fee, due_fee
       FROM students
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );

    if (students.length === 0) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    const student = students[0];
    const currentDue = Number(student.due_fee || 0);

    if (currentDue <= 0) {
      res.status(400).json({
        success: false,
        message: "This student already has no pending fee",
      });
      return;
    }

    const paymentAmount = Math.min(amount, currentDue);
    const nextPaid = Number(student.paid_fee || 0) + paymentAmount;
    const nextDue = Math.max(currentDue - paymentAmount, 0);
    const feeStatus = nextDue === 0 ? "paid" : nextPaid > 0 ? "partial" : "unpaid";
    const paymentMethod = (req.body.payment_method || "dummy-upi").trim();
    const transactionRef = `DUMMY-${Date.now()}-${student.id}`;

    await applyPaymentToInstallments(student.id, student.school_id, paymentAmount);

    await query(
      `INSERT INTO fee_payments
        (school_id, student_id, student_name, amount, payment_method, transaction_ref, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)`,
      [
        student.school_id,
        student.id,
        student.name,
        paymentAmount,
        paymentMethod,
        transactionRef,
        (req.body.notes || "Dummy payment through student portal").trim(),
      ]
    );

    await query(
      `UPDATE students
       SET paid_fee = ?, due_fee = ?, fee_status = ?
       WHERE id = ?`,
      [nextPaid, nextDue, feeStatus, student.id]
    );

    const updatedStudent = await query(
      `SELECT
         students.*,
         schools.name AS school_name,
         schools.code AS school_code
       FROM students
       LEFT JOIN schools ON schools.id = students.school_id
       WHERE students.id = ?
       LIMIT 1`,
      [student.id]
    );

    const payments = await query(
      `SELECT id, amount, payment_method, transaction_ref, status, notes, paid_at
       FROM fee_payments
       WHERE student_id = ?
       ORDER BY paid_at DESC, id DESC`,
      [student.id]
    );

    const snapshot = await loadStudentFeeSnapshot(student.id);

    res.status(201).json({
      success: true,
      message: "Dummy payment completed successfully",
      student: toStudentPayload(updatedStudent[0]),
      payments,
      installments: snapshot?.installments || [],
    });
  })
);

app.post(
  "/mark-attendance/bulk",
  asyncHandler(async (req, res) => {
    const missingFields = requireFields(req.body, ["subject", "date", "entries"]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];

    if (entries.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one student attendance entry is required",
      });
      return;
    }

    for (const entry of entries) {
      if (!entry.student_id || !entry.status) {
        res.status(400).json({
          success: false,
          message: "Each attendance row must include student_id and status",
        });
        return;
      }
    }

    const studentIds = entries.map((entry) => entry.student_id);
    const students = await query(
      `SELECT id, school_id, name
       FROM students
       WHERE id IN (?)`,
      [studentIds]
    );

    const studentMap = new Map(students.map((student) => [String(student.id), student]));
    const existingRows = await query(
      `SELECT id, student_id
       FROM attendance
       WHERE subject = ? AND date = ? AND student_id IN (?)`,
      [req.body.subject.trim(), req.body.date, studentIds]
    );

    const existingMap = new Map(existingRows.map((row) => [String(row.student_id), row.id]));
    const insertValues = [];

    for (const entry of entries) {
      const student = studentMap.get(String(entry.student_id));
      if (!student) {
        res.status(404).json({
          success: false,
          message: `Student not found for ID ${entry.student_id}`,
        });
        return;
      }

      if (existingMap.has(String(entry.student_id))) {
        await query(
          `UPDATE attendance
           SET status = ?
           WHERE id = ?`,
          [entry.status, existingMap.get(String(entry.student_id))]
        );
      } else {
        insertValues.push([
          student.school_id,
          student.id,
          student.name,
          req.body.subject.trim(),
          req.body.date,
          entry.status,
        ]);
      }
    }

    if (insertValues.length > 0) {
      await query(
        `INSERT INTO attendance (school_id, student_id, student_name, subject, date, status)
         VALUES ?`,
        [insertValues]
      );
    }

    await createAuditLog({
      schoolId: students[0]?.school_id || null,
      userName: req.body.updated_by || req.body.updatedBy || "Teacher",
      action: `Saved bulk attendance for ${req.body.subject.trim()} on ${req.body.date}`,
      module: "Attendance",
    });

    res.status(201).json({
      success: true,
      message: "Bulk attendance saved successfully",
      count: entries.length,
    });
  })
);

app.get(
  "/payments",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));

      if (!school) {
        res.json({
          success: true,
          payments: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const schoolFilter = buildSchoolFilter(schoolId, "fee_payments");
    const payments = await query(
      `SELECT
         fee_payments.id,
         fee_payments.student_id,
         fee_payments.student_name,
         fee_payments.amount,
         fee_payments.payment_method,
         fee_payments.transaction_ref,
         fee_payments.status,
         fee_payments.notes,
         fee_payments.paid_at,
         schools.name AS school_name
       FROM fee_payments
       LEFT JOIN schools ON schools.id = fee_payments.school_id
       ${schoolFilter.clause}
       ORDER BY fee_payments.paid_at DESC, fee_payments.id DESC`,
      schoolFilter.params
    );

    res.json({
      success: true,
      payments,
    });
  })
);

app.get(
  "/payments/class-summary",
  asyncHandler(async (req, res) => {
    let schoolId = req.query.schoolId;

    if (!schoolId && req.query.schoolCode) {
      const school = await getSchoolByCode(normalizeStudentCode(req.query.schoolCode));

      if (!school) {
        res.json({
          success: true,
          classes: [],
        });
        return;
      }

      schoolId = school.id;
    }

    const params = [];
    const conditions = [];

    if (schoolId) {
      conditions.push("students.school_id = ?");
      params.push(schoolId);
    }

    if (req.query.className && normalizeClassName(req.query.className)) {
      conditions.push("students.class = ?");
      params.push(normalizeClassName(req.query.className));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const summaries = await query(
      `SELECT
         students.class AS class_name,
         COUNT(*) AS total_students,
         SUM(CASE WHEN students.fee_status = 'paid' THEN 1 ELSE 0 END) AS paid_students,
         SUM(CASE WHEN students.fee_status = 'partial' THEN 1 ELSE 0 END) AS partial_students,
         SUM(CASE WHEN students.fee_status = 'unpaid' THEN 1 ELSE 0 END) AS unpaid_students,
         COALESCE(SUM(students.annual_fee), 0) AS annual_fee,
         COALESCE(SUM(students.paid_fee), 0) AS paid_fee,
         COALESCE(SUM(students.due_fee), 0) AS due_fee
       FROM students
       ${whereClause}
       GROUP BY students.class
       ORDER BY CAST(students.class AS UNSIGNED) ASC, students.class ASC`,
      params
    );

    res.json({
      success: true,
      classes: summaries.map((summary) => ({
        ...summary,
        total_students: Number(summary.total_students || 0),
        paid_students: Number(summary.paid_students || 0),
        partial_students: Number(summary.partial_students || 0),
        unpaid_students: Number(summary.unpaid_students || 0),
        annual_fee: Number(summary.annual_fee || 0),
        paid_fee: Number(summary.paid_fee || 0),
        due_fee: Number(summary.due_fee || 0),
      })),
    });
  })
);

const registerFrontendApp = () => {
  const frontendIndexPath = path.join(frontendBuildPath, "index.html");

  if (!fs.existsSync(frontendIndexPath)) {
    return;
  }

  app.use(express.static(frontendBuildPath));

  app.get(/.*/, (req, res, next) => {
    if (!req.accepts("html")) {
      next();
      return;
    }

    res.sendFile(frontendIndexPath);
  });
};

const startServer = async () => {
  await bootstrapDatabase();

  const existingSchools = await getSchools();
  if (existingSchools.length === 0) {
    await query(
      `INSERT INTO schools (name, code, board, contact_email, contact_phone, address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "Demo Public School",
        "DPS001",
        "CBSE",
        "admin@demopublicschool.com",
        "9999999999",
        "Main Campus Road",
      ]
    );
  }

  await backfillStudentCodes();
  registerFrontendApp();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to bootstrap server", error);
  process.exit(1);
});

/*




  res.json({ status: "OK", message: "Server is running 🚀" });
});
*/
