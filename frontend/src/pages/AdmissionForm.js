import { useEffect, useState } from "react";

import api from "../api";
import {
  hasLengthBetween,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "../utils/validation";
import "../styles/appShell.css";

const initialForm = {
  school_id: "",
  schoolCode: "",
  student_name: "",
  class_name: "",
  previous_school: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  parent_password: "",
  notes: "",
};

const sanitizeDigits = (value, maxLength) => String(value || "").replace(/\D/g, "").slice(0, maxLength);

const buildAdmissionErrors = (form) => {
  const errors = {};

  if (!form.school_id) {
    errors.school_id = "School select karo.";
  }

  if (!hasLengthBetween(form.student_name, 2, 80)) {
    errors.student_name = "Student name 2 se 80 characters ke beech hona chahiye.";
  }

  if (!hasLengthBetween(form.class_name, 1, 30)) {
    errors.class_name = "Applying class required hai.";
  }

  if (!hasLengthBetween(form.parent_name, 2, 80)) {
    errors.parent_name = "Parent name 2 se 80 characters ke beech hona chahiye.";
  }

  if (!isValidEmail(form.parent_email)) {
    errors.parent_email = "Valid parent email enter karo. Example: abc@gmail.com";
  }

  if (!isValidPhone(form.parent_phone)) {
    errors.parent_phone = "Parent phone me exactly 10 digits honi chahiye.";
  }

  if (!hasLengthBetween(form.parent_password, 4, 64)) {
    errors.parent_password = "Parent portal password 4 se 64 characters ke beech hona chahiye.";
  }

  if (form.previous_school && !hasLengthBetween(form.previous_school, 2, 120)) {
    errors.previous_school = "Previous school 120 characters se chhota hona chahiye.";
  }

  if (form.notes && normalizeText(form.notes).length > 500) {
    errors.notes = "Notes 500 characters se zyada nahi hone chahiye.";
  }

  return errors;
};

function AdmissionForm() {
  const [form, setForm] = useState(initialForm);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [referenceNumber, setReferenceNumber] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data } = await api.get("/schools");
        setSchools(data.schools || []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.response?.data?.message || "Unable to load schools.",
        });
      }
    };

    loadSchools();
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      if (!form.schoolCode) {
        setClasses([]);
        return;
      }

      try {
        const { data } = await api.get("/classes", {
          params: { schoolCode: form.schoolCode },
        });
        setClasses(data.classes || []);
      } catch (requestError) {
        setStatus({
          type: "error",
          message: requestError.response?.data?.message || "Unable to load classes.",
        });
      }
    };

    loadClasses();
  }, [form.schoolCode]);

  const updateField = (field) => (event) => {
    const rawValue = event.target.value;
    const value = field === "parent_phone" ? sanitizeDigits(rawValue, 10) : rawValue;

    if (field === "school_id") {
      const selectedSchool = schools.find((school) => String(school.id) === String(value));
      setForm((current) => ({
        ...current,
        school_id: value,
        schoolCode: selectedSchool?.code || "",
        class_name: "",
      }));
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.school_id;
        delete nextErrors.class_name;
        return nextErrors;
      });
      return;
    }

    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const submitAdmission = async (event) => {
    event.preventDefault();

    const errors = buildAdmissionErrors(form);

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setStatus({ type: "error", message: Object.values(errors)[0] });
      return;
    }

    try {
      setFieldErrors({});
      const { data } = await api.post("/admissions", {
        ...form,
        student_name: normalizeText(form.student_name),
        class_name: normalizeText(form.class_name),
        previous_school: normalizeText(form.previous_school),
        parent_name: normalizeText(form.parent_name),
        parent_email: normalizeEmail(form.parent_email),
        parent_phone: normalizePhone(form.parent_phone),
        notes: form.notes.trim(),
      });
      setStatus({ type: "success", message: data.message });
      setReferenceNumber(data.reference_number || "");
      setForm(initialForm);
      setFieldErrors({});
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to submit admission form.",
      });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2>Admission Form</h2>
            <p>Submit a new admission request and create the parent portal credentials at the same time.</p>
          </div>
        </div>

        <form onSubmit={submitAdmission} noValidate>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="admission-school">School</label>
            <select id="admission-school" value={form.school_id} onChange={updateField("school_id")}>
              <option value="">Select School</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} ({school.code})
                </option>
              ))}
            </select>
            {fieldErrors.school_id ? <small className="status-message error">{fieldErrors.school_id}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-student-name">Student Name</label>
            <input id="admission-student-name" value={form.student_name} onChange={updateField("student_name")} />
            {fieldErrors.student_name ? <small className="status-message error">{fieldErrors.student_name}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-class-name">Applying Class</label>
            {classes.length ? (
              <select
                id="admission-class-name"
                value={form.class_name}
                onChange={updateField("class_name")}
                disabled={!form.school_id}
              >
                <option value="">Select Class</option>
                {classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.class_name}>
                    Class {classItem.class_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="admission-class-name"
                value={form.class_name}
                onChange={updateField("class_name")}
                placeholder="Enter class"
              />
            )}
            {fieldErrors.class_name ? <small className="status-message error">{fieldErrors.class_name}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-previous-school">Previous School</label>
            <input id="admission-previous-school" value={form.previous_school} onChange={updateField("previous_school")} />
            {fieldErrors.previous_school ? <small className="status-message error">{fieldErrors.previous_school}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-name">Parent Name</label>
            <input id="admission-parent-name" value={form.parent_name} onChange={updateField("parent_name")} />
            {fieldErrors.parent_name ? <small className="status-message error">{fieldErrors.parent_name}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-email">Parent Email</label>
            <input
              id="admission-parent-email"
              type="email"
              inputMode="email"
              placeholder="abc@gmail.com"
              value={form.parent_email}
              onChange={updateField("parent_email")}
            />
            {fieldErrors.parent_email ? <small className="status-message error">{fieldErrors.parent_email}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-phone">Parent Phone</label>
            <input
              id="admission-parent-phone"
              type="tel"
              inputMode="numeric"
              maxLength="10"
              pattern="\d{10}"
              placeholder="9876543210"
              value={form.parent_phone}
              onChange={updateField("parent_phone")}
            />
            {fieldErrors.parent_phone ? <small className="status-message error">{fieldErrors.parent_phone}</small> : null}
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-password">Parent Portal Password</label>
            <input id="admission-parent-password" type="password" value={form.parent_password} onChange={updateField("parent_password")} />
            {fieldErrors.parent_password ? <small className="status-message error">{fieldErrors.parent_password}</small> : null}
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="admission-notes">Notes</label>
            <textarea id="admission-notes" rows="4" value={form.notes} onChange={updateField("notes")} />
            {fieldErrors.notes ? <small className="status-message error">{fieldErrors.notes}</small> : null}
          </div>
        </div>

        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}
        {referenceNumber ? <p className="status-message success">Reference Number: {referenceNumber}</p> : null}

        <div className="button-row">
          <button className="primary-button" type="submit">
            Submit Admission
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

export default AdmissionForm;
