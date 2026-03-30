import { useEffect, useState } from "react";

import api from "../api";
import "../styles/appShell.css";

const initialForm = {
  school_id: "",
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

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitAdmission = async () => {
    try {
      const { data } = await api.post("/admissions", form);
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
            <input id="admission-class-name" value={form.class_name} onChange={updateField("class_name")} />
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
