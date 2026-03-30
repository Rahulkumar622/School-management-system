import { useEffect, useState } from "react";

import api from "../api";
import { getAdminSession } from "../session";
import "../styles/appShell.css";

const initialForm = {
  school_id: "",
  name: "",
  email: "",
  password: "",
};

const createInitialForm = (schoolId = "") => ({
  ...initialForm,
  school_id: schoolId,
});

function AddTeacher() {
  const adminSession = getAdminSession();
  const lockedSchoolId =
    adminSession?.role === "school_admin" && adminSession.school_id
      ? String(adminSession.school_id)
      : "";
  const [form, setForm] = useState(() => createInitialForm(lockedSchoolId));
  const [schools, setSchools] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
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

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleAddTeacher = async () => {
    if (!form.school_id || !form.name.trim() || !form.email.trim() || !form.password) {
      setStatus({ type: "error", message: "Fill in all teacher details first." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.post("/add-teacher", {
        ...form,
        email: form.email.trim(),
      });

      setForm(createInitialForm(lockedSchoolId));
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to add teacher.",
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
            <h2>Add Teacher</h2>
            <p>Create teacher access under a selected school.</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="teacher-school">School</label>
            <select
              id="teacher-school"
              value={form.school_id}
              onChange={updateField("school_id")}
              disabled={Boolean(lockedSchoolId)}
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
            <label htmlFor="teacher-name">Teacher Name</label>
            <input id="teacher-name" value={form.name} onChange={updateField("name")} />
          </div>
          <div className="field-group">
            <label htmlFor="teacher-email">Email</label>
            <input
              id="teacher-email"
              type="email"
              value={form.email}
              onChange={updateField("email")}
            />
          </div>
          <div className="field-group">
            <label htmlFor="teacher-password">Password</label>
            <input
              id="teacher-password"
              type="password"
              value={form.password}
              onChange={updateField("password")}
            />
          </div>
        </div>

        {status.message ? (
          <p className={`status-message ${status.type}`}>{status.message}</p>
        ) : null}

        <div className="button-row">
          <button
            className="primary-button"
            onClick={handleAddTeacher}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Add Teacher"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTeacher;
