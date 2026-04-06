import { useState } from "react";

import api from "../api";
import { hasLengthBetween, normalizeText } from "../utils/validation";
import "../styles/appShell.css";

function MarkAttendance() {
  const [studentInput, setStudentInput] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudent = async (identifier) => {
    if (!identifier.trim()) {
      setStudentId("");
      setStudentName("");
      return;
    }

    try {
      const { data } = await api.get(`/student/${identifier}`);
      setStudentId(String(data.student?.id || ""));
      setStudentName(data.student?.name || "");
      setStatus({ type: "", message: "" });
    } catch (requestError) {
      setStudentId("");
      setStudentName("");
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Student not found.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!studentId || !studentName || !subject.trim() || !statusValue) {
      setStatus({ type: "error", message: "Complete all attendance details first." });
      return;
    }

    if (!hasLengthBetween(subject, 2, 60)) {
      setStatus({ type: "error", message: "Subject 2 se 60 characters ke beech hona chahiye." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.post("/mark-attendance", {
        student_id: studentId,
        subject: normalizeText(subject),
        date: new Date().toISOString().slice(0, 10),
        status: statusValue,
      });

      setSubject("");
      setStatusValue("");
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message:
          requestError.response?.data?.message || "Unable to mark attendance.",
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
            <h2>Mark Attendance</h2>
            <p>Search the student by numeric ID or generated code and save attendance.</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="attendance-student-id">Student ID / Code</label>
            <input
              id="attendance-student-id"
              value={studentInput}
              onChange={(event) => {
                const value = event.target.value;
                setStudentInput(value);
                fetchStudent(value);
              }}
            />
          </div>
          <div className="field-group">
            <label htmlFor="attendance-resolved-id">Resolved Student ID</label>
            <input id="attendance-resolved-id" value={studentId} readOnly />
          </div>
          <div className="field-group">
            <label htmlFor="attendance-student-name">Student Name</label>
            <input id="attendance-student-name" value={studentName} readOnly />
          </div>
          <div className="field-group">
            <label htmlFor="attendance-subject">Subject</label>
            <input
              id="attendance-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="attendance-status">Status</label>
            <select
              id="attendance-status"
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value)}
            >
              <option value="">Select Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
        </div>

        {status.message ? (
          <p className={`status-message ${status.type}`}>{status.message}</p>
        ) : null}

        <div className="button-row">
          <button className="primary-button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Submit Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MarkAttendance;
