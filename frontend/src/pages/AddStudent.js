import { useEffect, useState } from "react";

import api from "../api";
import { getAdminSession } from "../session";
import {
  hasLengthBetween,
  isNonNegativeNumber,
  isValidEmail,
  isValidRollNumber,
  isValidSection,
  normalizeEmail,
  normalizeText,
} from "../utils/validation";
import "../styles/appShell.css";

const initialForm = {
  school_id: "",
  parent_id: "",
  name: "",
  className: "",
  section: "",
  roll_no: "",
  email: "",
  password: "",
  annual_fee: "",
};

const createInitialForm = (schoolId = "") => ({
  ...initialForm,
  school_id: schoolId,
});

function AddStudent() {
  const adminSession = getAdminSession();
  const lockedSchoolId =
    adminSession?.role === "school_admin" && adminSession.school_id
      ? String(adminSession.school_id)
      : "";
  const [form, setForm] = useState(() => createInitialForm(lockedSchoolId));
  const [schools, setSchools] = useState([]);
  const [parents, setParents] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [studentCode, setStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data } = await api.get("/schools");
        const schoolOptions = data.schools || [];
        setSchools(schoolOptions);

        if (lockedSchoolId) {
          setForm((current) => ({
            ...current,
            school_id: lockedSchoolId,
          }));
        }
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.response?.data?.message || "Unable to load schools.",
        });
      }
    };

    loadSchools();
  }, [lockedSchoolId]);

  useEffect(() => {
    const loadParents = async () => {
      if (!form.school_id) {
        setParents([]);
        return;
      }

      try {
        const { data } = await api.get("/parents", {
          params: { schoolId: form.school_id },
        });
        setParents(data.parents || []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.response?.data?.message || "Unable to load parent accounts.",
        });
      }
    };

    loadParents();
  }, [form.school_id]);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "school_id" ? { parent_id: "" } : {}),
    }));
  };

  const addStudent = async () => {
    const emptyField = Object.entries(form).find(
      ([field, value]) => field !== "parent_id" && !String(value).trim()
    );

    if (emptyField) {
      setStatus({ type: "error", message: "Fill in all student details first." });
      return;
    }

    if (!hasLengthBetween(form.name, 2, 80)) {
      setStatus({ type: "error", message: "Student name 2 se 80 characters ke beech hona chahiye." });
      return;
    }

    if (!hasLengthBetween(form.className, 1, 30)) {
      setStatus({ type: "error", message: "Class required hai aur 30 characters se chhoti honi chahiye." });
      return;
    }

    if (!isValidSection(form.section)) {
      setStatus({ type: "error", message: "Section me sirf letters ya numbers hone chahiye." });
      return;
    }

    if (!isValidRollNumber(form.roll_no)) {
      setStatus({ type: "error", message: "Roll number positive whole number hona chahiye." });
      return;
    }

    if (!isValidEmail(form.email)) {
      setStatus({ type: "error", message: "Valid student email enter karo." });
      return;
    }

    if (!hasLengthBetween(form.password, 4, 64)) {
      setStatus({ type: "error", message: "Password 4 se 64 characters ke beech hona chahiye." });
      return;
    }

    if (!isNonNegativeNumber(form.annual_fee)) {
      setStatus({ type: "error", message: "Annual fee 0 ya usse zyada hona chahiye." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.post("/add-student", {
        ...form,
        name: normalizeText(form.name),
        className: normalizeText(form.className),
        section: normalizeText(form.section).toUpperCase(),
        roll_no: normalizeText(form.roll_no),
        email: normalizeEmail(form.email),
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        annual_fee: Number(form.annual_fee),
      });

      setForm(createInitialForm(lockedSchoolId));
      setStudentCode(data.student_code || "");
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to add student.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2>Add Student</h2>
            <p>Create a student, assign a school, and define the annual fee amount.</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="student-school">School</label>
            <select
              id="student-school"
              value={form.school_id}
              onChange={updateField("school_id")}
              disabled={adminSession?.role === "school_admin"}
            >
              <option value="">Select School</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="student-parent">Linked Parent</label>
            <select
              id="student-parent"
              value={form.parent_id}
              onChange={updateField("parent_id")}
              disabled={!form.school_id}
            >
              <option value="">No Parent Link</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} ({parent.email})
                </option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="student-name">Name</label>
            <input id="student-name" value={form.name} onChange={updateField("name")} />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <p className="empty-state" style={{ marginTop: "0" }}>
              Parent account select karne se child parent dashboard me linked student ke roop me dikhne lagega.
            </p>
          </div>
          <div className="field-group">
            <label htmlFor="student-class">Class</label>
            <select id="student-class" value={form.className} onChange={updateField("className")}>
              <option value="">Select Class</option>
              <option value="Nursery">Nursery</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="student-section">Section</label>
            <input id="student-section" value={form.section} onChange={updateField("section")} />
          </div>
          <div className="field-group">
            <label htmlFor="student-roll">Roll Number</label>
            <input id="student-roll" value={form.roll_no} onChange={updateField("roll_no")} />
          </div>
          <div className="field-group">
            <label htmlFor="student-fee">Annual Fee</label>
            <input
              id="student-fee"
              type="number"
              min="0"
              value={form.annual_fee}
              onChange={updateField("annual_fee")}
            />
          </div>
          <div className="field-group">
            <label htmlFor="student-email">Email</label>
            <input
              id="student-email"
              type="email"
              value={form.email}
              onChange={updateField("email")}
            />
          </div>
          <div className="field-group">
            <label htmlFor="student-password">Password</label>
            <input
              id="student-password"
              type="password"
              value={form.password}
              onChange={updateField("password")}
            />
          </div>
        </div>

        {status.message ? (
          <p className={`status-message ${status.type}`}>{status.message}</p>
        ) : null}
        {studentCode ? (
          <p className="status-message success">Generated Student Code: {studentCode}</p>
        ) : null}

        <div className="button-row">
          <button className="primary-button" onClick={addStudent} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add Student"}
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setForm(createInitialForm(lockedSchoolId));
              setStudentCode("");
              setStatus({ type: "", message: "" });
            }}
            disabled={isSubmitting}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddStudent;
