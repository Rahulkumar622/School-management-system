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

function AdmissionForm() {
  const [form, setForm] = useState(initialForm);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [referenceNumber, setReferenceNumber] = useState("");

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
    const value = event.target.value;

    if (field === "school_id") {
      const selectedSchool = schools.find((school) => String(school.id) === String(value));
      setForm((current) => ({
        ...current,
        school_id: value,
        schoolCode: selectedSchool?.code || "",
        class_name: "",
      }));
      return;
    }

    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitAdmission = async () => {
    if (!form.school_id) {
      setStatus({ type: "error", message: "School select karo." });
      return;
    }

    if (!hasLengthBetween(form.student_name, 2, 80)) {
      setStatus({ type: "error", message: "Student name 2 se 80 characters ke beech hona chahiye." });
      return;
    }

    if (!hasLengthBetween(form.class_name, 1, 30)) {
      setStatus({ type: "error", message: "Applying class required hai." });
      return;
    }

    if (!hasLengthBetween(form.parent_name, 2, 80)) {
      setStatus({ type: "error", message: "Parent name 2 se 80 characters ke beech hona chahiye." });
      return;
    }

    if (!isValidEmail(form.parent_email)) {
      setStatus({ type: "error", message: "Valid parent email enter karo." });
      return;
    }

    if (!isValidPhone(form.parent_phone)) {
      setStatus({ type: "error", message: "Parent phone me 10 se 15 digits honi chahiye." });
      return;
    }

    if (!hasLengthBetween(form.parent_password, 4, 64)) {
      setStatus({ type: "error", message: "Parent portal password 4 se 64 characters ke beech hona chahiye." });
      return;
    }

    if (form.previous_school && !hasLengthBetween(form.previous_school, 2, 120)) {
      setStatus({ type: "error", message: "Previous school 120 characters se chhota hona chahiye." });
      return;
    }

    if (form.notes && normalizeText(form.notes).length > 500) {
      setStatus({ type: "error", message: "Notes 500 characters se zyada nahi hone chahiye." });
      return;
    }

    try {
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
          </div>
          <div className="field-group">
            <label htmlFor="admission-student-name">Student Name</label>
            <input id="admission-student-name" value={form.student_name} onChange={updateField("student_name")} />
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
          </div>
          <div className="field-group">
            <label htmlFor="admission-previous-school">Previous School</label>
            <input id="admission-previous-school" value={form.previous_school} onChange={updateField("previous_school")} />
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-name">Parent Name</label>
            <input id="admission-parent-name" value={form.parent_name} onChange={updateField("parent_name")} />
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-email">Parent Email</label>
            <input id="admission-parent-email" type="email" value={form.parent_email} onChange={updateField("parent_email")} />
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-phone">Parent Phone</label>
            <input id="admission-parent-phone" value={form.parent_phone} onChange={updateField("parent_phone")} />
          </div>
          <div className="field-group">
            <label htmlFor="admission-parent-password">Parent Portal Password</label>
            <input id="admission-parent-password" type="password" value={form.parent_password} onChange={updateField("parent_password")} />
          </div>
          <div className="field-group" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="admission-notes">Notes</label>
            <textarea id="admission-notes" rows="4" value={form.notes} onChange={updateField("notes")} />
          </div>
        </div>

        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}
        {referenceNumber ? <p className="status-message success">Reference Number: {referenceNumber}</p> : null}

        <div className="button-row">
          <button className="primary-button" onClick={submitAdmission}>
            Submit Admission
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdmissionForm;
