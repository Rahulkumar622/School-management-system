import React, { useEffect, useMemo, useState } from "react";

import api from "../api";
import { getAdminSession, getTeacherSession } from "../session";
import "../styles/appShell.css";
import "../styles/viewStudents.css";

function ViewStudents() {
  const adminSession = getAdminSession();
  const teacherSession = getTeacherSession();
  const currentUser = adminSession || teacherSession;
  const lockedSchoolId =
    currentUser?.role === "school_admin" || teacherSession?.id
      ? currentUser?.school_id
      : "";
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [linkValues, setLinkValues] = useState({});
  const [savingStudentId, setSavingStudentId] = useState(null);

  const formatClassLabel = (className) => {
    const trimmedClass = String(className || "").trim();

    if (!trimmedClass) {
      return "";
    }

    const lowerClass = trimmedClass.toLowerCase();
    if (
      lowerClass.endsWith("st") ||
      lowerClass.endsWith("nd") ||
      lowerClass.endsWith("rd") ||
      lowerClass.endsWith("th")
    ) {
      return trimmedClass;
    }

    if (/^\d+$/.test(trimmedClass)) {
      const classNumber = Number(trimmedClass);
      const lastTwoDigits = classNumber % 100;

      if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
        return `${classNumber}th`;
      }

      const lastDigit = classNumber % 10;

      if (lastDigit === 1) {
        return `${classNumber}st`;
      }

      if (lastDigit === 2) {
        return `${classNumber}nd`;
      }

      if (lastDigit === 3) {
        return `${classNumber}rd`;
      }

      return `${classNumber}th`;
    }

    return trimmedClass;
  };

  const classOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => String(student.class || "").trim())
            .filter(Boolean)
        )
      ).sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
      ),
    [students]
  );

  const filteredStudents = useMemo(() => {
    if (selectedClass === "all") {
      return students;
    }

    return students.filter(
      (student) => String(student.class || "").trim() === selectedClass
    );
  }, [selectedClass, students]);

  useEffect(() => {
    if (lockedSchoolId) {
      setSelectedSchool(String(lockedSchoolId));
    }
  }, [lockedSchoolId]);

  useEffect(() => {
    setSelectedClass("all");
  }, [selectedSchool, lockedSchoolId]);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data } = await api.get("/schools");
        const schoolOptions = data.schools || [];
        setSchools(
          lockedSchoolId
            ? schoolOptions.filter((school) => Number(school.id) === Number(lockedSchoolId))
            : schoolOptions
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to fetch schools."
        );
      }
    };

    loadSchools();
  }, [lockedSchoolId]);

  useEffect(() => {
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        const params =
          lockedSchoolId
            ? { schoolId: lockedSchoolId }
            : selectedSchool
              ? { schoolId: selectedSchool }
              : undefined;
        const { data } = await api.get("/students", { params });
        setStudents(data.students || []);
        setLinkValues(
          (data.students || []).reduce((accumulator, student) => {
            accumulator[String(student.id)] = student.parent_id ? String(student.parent_id) : "";
            return accumulator;
          }, {})
        );
        setError("");
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to fetch students."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, [selectedSchool, lockedSchoolId]);

  useEffect(() => {
    const loadParents = async () => {
      try {
        const params =
          lockedSchoolId
            ? { schoolId: lockedSchoolId }
            : selectedSchool
              ? { schoolId: selectedSchool }
              : undefined;
        const { data } = await api.get("/parents", { params });
        setParents(data.parents || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to fetch parent accounts."
        );
      }
    };

    loadParents();
  }, [selectedSchool, lockedSchoolId]);

  const handleParentSelection = (studentId, parentId) => {
    setLinkValues((current) => ({
      ...current,
      [String(studentId)]: parentId,
    }));
  };

  const handleParentLinkSave = async (student) => {
    const nextParentId = linkValues[String(student.id)] || "";

    setSavingStudentId(student.id);
    setStatus({ type: "", message: "" });

    try {
      const { data } = await api.patch(`/students/${student.id}/link-parent`, {
        parent_id: nextParentId ? Number(nextParentId) : null,
      });

      setStudents((current) =>
        current.map((item) => (item.id === student.id ? data.student : item))
      );
      setLinkValues((current) => ({
        ...current,
        [String(student.id)]: data.student.parent_id ? String(data.student.parent_id) : "",
      }));
      setStatus({ type: "success", message: data.message });
    } catch (requestError) {
      setStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to update parent link.",
      });
    } finally {
      setSavingStudentId(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <div className="header-copy">
            <span className="eyebrow">Student Directory</span>
            <h2>Students</h2>
            <div className="hero-meta">
              <span className="meta-chip">Total School Students: {students.length}</span>
              <span className="meta-chip">Visible: {filteredStudents.length}</span>
              <span className="meta-chip">Classes: {classOptions.length}</span>
              {lockedSchoolId ? <span className="meta-chip">School locked</span> : null}
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div className="info-card student-filter-card">
            <div className="section-heading">
              <div>
                <h3>Filter Students</h3>
                <p className="section-caption">School aur class ke hisaab se roster ko instantly filter karein.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="student-filter-school">Filter by School</label>
                <select
                  id="student-filter-school"
                  value={selectedSchool}
                  onChange={(event) => setSelectedSchool(event.target.value)}
                  disabled={Boolean(lockedSchoolId)}
                >
                  <option value="">All Schools</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name} ({school.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="student-filter-class">Filter by Class</label>
                <select
                  id="student-filter-class"
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                >
                  <option value="all">All Students</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      {formatClassLabel(className)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="student-filter-summary">
              <div className="student-filter-spotlight">
                <span className="card-eyebrow">Dropdown View</span>
                <h4>
                  {selectedClass === "all"
                    ? "All Students"
                    : `${formatClassLabel(selectedClass)} Students`}
                </h4>
                <p>
                  {selectedClass === "all"
                    ? "Dropdown me All Students select karne par selected school ke saare students yahan dikhte hain."
                    : `Dropdown se ${formatClassLabel(selectedClass)} select ki gayi hai, isliye sirf us class ke ${filteredStudents.length} students dikh rahe hain.`}
                </p>
              </div>
              <div className="student-filter-summary-card">
                <span className="card-eyebrow">Selected Count</span>
                <h4>{filteredStudents.length}</h4>
                <p>
                  {selectedClass === "all"
                    ? "Ye selected school ka total student count hai."
                    : `Ye ${formatClassLabel(selectedClass)} class ka total student count hai.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}
        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

        {isLoading ? (
          <p className="empty-state">Students load ho rahe hain...</p>
        ) : students.length === 0 ? (
          <p className="empty-state">No students found yet.</p>
        ) : filteredStudents.length === 0 ? (
          <div className="info-card student-empty-card">
            <span className="card-eyebrow">No Match</span>
            <h3>No students found for this class filter.</h3>
            <p className="section-caption">Class change karke ya Total School Students select karke full roster dekhein.</p>
          </div>
        ) : (
          <div className="info-card table-panel">
            <div className="table-panel-header">
              <span className="card-eyebrow">Live Records</span>
              <h3>
                {selectedClass === "all"
                  ? "All Student Records"
                  : `${formatClassLabel(selectedClass)} Student Records`}
              </h3>
              <p className="section-caption">Responsive table me filtered roster visible hai.</p>
            </div>

            <div className="table-wrapper">
              <table className="data-table wide-table">
                <thead>
                  <tr>
                    <th>Student Code</th>
                    <th>School</th>
                    <th>Name</th>
                    <th>Linked Parent</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Roll No</th>
                    <th>Annual Fee</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Fee Status</th>
                    {!teacherSession?.id ? <th>Manage Parent Link</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.student_code || "-"}</td>
                      <td>{student.school_name || "-"}</td>
                      <td>{student.name}</td>
                      <td>
                        {student.parent_name ? `${student.parent_name} (${student.parent_email || "-"})` : "Not linked"}
                      </td>
                      <td>{student.class}</td>
                      <td>{student.section}</td>
                      <td>{student.roll_no}</td>
                      <td>Rs. {Number(student.annual_fee || 0).toFixed(2)}</td>
                      <td>Rs. {Number(student.paid_fee || 0).toFixed(2)}</td>
                      <td>Rs. {Number(student.due_fee || 0).toFixed(2)}</td>
                      <td className="capitalize">{student.fee_status}</td>
                      {!teacherSession?.id ? (
                        <td className="actions-cell">
                          <div className="table-actions" style={{ minWidth: "220px" }}>
                            <select
                              value={linkValues[String(student.id)] ?? ""}
                              onChange={(event) =>
                                handleParentSelection(student.id, event.target.value)
                              }
                            >
                              <option value="">No Parent Link</option>
                              {parents
                                .filter(
                                  (parent) =>
                                    Number(parent.school_id) === Number(student.school_id)
                                )
                                .map((parent) => (
                                  <option key={parent.id} value={parent.id}>
                                    {parent.name} ({parent.email})
                                  </option>
                                ))}
                            </select>
                            <button
                              className="secondary-button"
                              onClick={() => handleParentLinkSave(student)}
                              disabled={
                                savingStudentId === student.id ||
                                String(student.parent_id || "") ===
                                  String(linkValues[String(student.id)] || "")
                              }
                            >
                              {savingStudentId === student.id ? "Saving..." : "Save Link"}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewStudents;
