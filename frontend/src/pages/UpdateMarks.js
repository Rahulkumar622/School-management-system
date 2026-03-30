import { useState } from "react";

import api from "../api";
import "../styles/appShell.css";

const currentYear = new Date().getFullYear();

function UploadMarks() {
  const [studentInput, setStudentInput] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [subject, setSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [year, setYear] = useState(String(currentYear));
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
    if (!studentId || !studentName || !subject.trim() || !marks || !year.trim()) {
      setStatus({ type: "error", message: "Complete all marks details first." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.post("/upload-marks", {
        student_id: studentId,
        subject: subject.trim(),
        marks,
        year,
      });

      setSubject("");
      setMarks("");
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to upload marks.",
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
            <h2>Upload Marks</h2>
            <p>Find the student by numeric ID or generated student code, then store marks.</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="marks-student-id">Student ID / Code</label>
            <input
              id="marks-student-id"
              value={studentInput}
              onChange={(event) => {
                const value = event.target.value;
                setStudentInput(value);
                fetchStudent(value);
              }}
            />
          </div>
          <div className="field-group">
            <label htmlFor="marks-resolved-id">Resolved Student ID</label>
            <input id="marks-resolved-id" value={studentId} readOnly />
          </div>
          <div className="field-group">
            <label htmlFor="marks-student-name">Student Name</label>
            <input id="marks-student-name" value={studentName} readOnly />
          </div>
          <div className="field-group">
            <label htmlFor="marks-subject">Subject</label>
            <input
              id="marks-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="marks-score">Marks</label>
            <input
              id="marks-score"
              type="number"
              min="0"
              max="100"
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="marks-year">Year</label>
            <input
              id="marks-year"
              type="number"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
        </div>

        {status.message ? (
          <p className={`status-message ${status.type}`}>{status.message}</p>
        ) : null}

        <div className="button-row">
          <button className="primary-button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Submit Marks"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadMarks;
