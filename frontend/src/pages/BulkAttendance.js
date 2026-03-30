import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { getTeacherSession } from "../session";
import "../styles/appShell.css";

const subjectSuggestions = {
  "1": ["English", "Maths", "EVS"],
  "2": ["English", "Maths", "Hindi", "EVS"],
  "3": ["English", "Maths", "Hindi", "Science", "Computer"],
  "4": ["English", "Maths", "Hindi", "Science", "Social Studies", "Computer"],
  "5": ["English", "Maths", "Hindi", "Science", "Social Studies", "Computer"],
  "6": ["English", "Maths", "Hindi", "Science", "Social Studies", "Computer"],
  "7": ["English", "Maths", "Hindi", "Science", "Social Studies", "Computer"],
  "8": ["English", "Maths", "Hindi", "Science", "Social Studies", "Computer"],
  "9": ["English", "Maths", "Science", "Social Science", "Computer"],
  "10": ["English", "Maths", "Science", "Social Science", "Computer"],
  "11": ["Physics", "Chemistry", "Maths", "Biology", "Accounts", "Economics"],
  "12": ["Physics", "Chemistry", "Maths", "Biology", "Accounts", "Economics"],
};

function BulkAttendance() {
  const navigate = useNavigate();
  const teacher = getTeacherSession();

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canLoadClass = teacher?.school_id && className.trim() && subject.trim() && attendanceDate;
  const selectedCount = useMemo(
    () => Object.values(attendanceMap).filter(Boolean).length,
    [attendanceMap]
  );
  const suggestedSubjects = subjectSuggestions[className.trim()] || [
    "English",
    "Maths",
    "Science",
    "Computer",
  ];

  const loadStudents = async () => {
    if (!canLoadClass) {
      setStatus({
        type: "error",
        message: "Class, date, aur subject select karo, phir students load honge.",
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.get("/students/classroom", {
        params: {
          schoolId: teacher.school_id,
          className: className.trim(),
          section: section.trim(),
          subject: subject.trim(),
          date: attendanceDate,
        },
      });

      const classroomStudents = data.students || [];
      setStudents(classroomStudents);
      setAttendanceMap(
        classroomStudents.reduce((accumulator, student) => {
          accumulator[student.id] = student.attendance_status || "Present";
          return accumulator;
        }, {})
      );

      if (classroomStudents.length === 0) {
        setStatus({ type: "error", message: "Is class/section me koi student nahi mila." });
      } else {
        setStatus({
          type: "success",
          message: "Class loaded. Existing attendance auto-filled hai agar pehle save thi.",
        });
      }
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Students load nahi ho paye.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setAllStatus = (value) => {
    setAttendanceMap((current) =>
      Object.keys(current).reduce((accumulator, studentId) => {
        accumulator[studentId] = value;
        return accumulator;
      }, {})
    );
  };

  const submitBulkAttendance = async () => {
    if (!subject.trim() || students.length === 0 || !attendanceDate) {
      setStatus({
        type: "error",
        message: "Subject, date, aur loaded class dono zaroori hain.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const entries = students.map((student) => ({
        student_id: student.id,
        status: attendanceMap[student.id] || "Present",
      }));

      const { data } = await api.post("/mark-attendance/bulk", {
        subject: subject.trim(),
        date: attendanceDate,
        entries,
      });

      setStatus({
        type: "success",
        message: `${data.message} (${data.count} students)`,
      });
    } catch (requestError) {
      setStatus({
        type: "error",
        message:
          requestError.response?.data?.message || "Bulk attendance save nahi ho payi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!teacher?.id) {
    return (
      <div className="page-shell">
        <div className="page-card">
          <p className="status-message error">Teacher session missing hai. Dobara login karo.</p>
          <div className="button-row">
            <button className="primary-button" onClick={() => navigate("/teacher-login")}>
              Back to Teacher Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div>
            <h2>Bulk Attendance</h2>
            <p>
              {teacher.school_name} ({teacher.school_code}) ke liye class-wise attendance ek saath mark karo.
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => navigate("/teacher-dashboard", { state: teacher })}
          >
            Back to Dashboard
          </button>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="bulk-class">Class</label>
            <input
              id="bulk-class"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="bulk-section">Section</label>
            <input
              id="bulk-section"
              value={section}
              onChange={(event) => setSection(event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="field-group">
            <label htmlFor="bulk-date">Attendance Date</label>
            <input
              id="bulk-date"
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label htmlFor="bulk-subject">Subject</label>
            <input
              id="bulk-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              list="bulk-subject-suggestions"
            />
            <datalist id="bulk-subject-suggestions">
              {suggestedSubjects.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={loadStudents} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load Class Students"}
          </button>
          <button
            className="secondary-button"
            onClick={() => setAllStatus("Present")}
            disabled={!students.length}
          >
            Mark All Present
          </button>
          <button
            className="secondary-button"
            onClick={() => setAllStatus("Absent")}
            disabled={!students.length}
          >
            Mark All Absent
          </button>
        </div>

        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

        {students.length ? (
          <div className="info-card table-panel" style={{ marginTop: "22px" }}>
            <div className="table-panel-header">
              <h3>Class Register</h3>
              <p className="section-caption">{selectedCount} students ready for submission.</p>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.roll_no}</td>
                      <td>{student.name}</td>
                      <td>{student.class}</td>
                      <td>{student.section}</td>
                      <td>
                        <select
                          value={attendanceMap[student.id] || "Present"}
                          onChange={(event) =>
                            setAttendanceMap((current) => ({
                              ...current,
                              [student.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="button-row">
              <button
                className="primary-button"
                onClick={submitBulkAttendance}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save / Update Attendance"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default BulkAttendance;
