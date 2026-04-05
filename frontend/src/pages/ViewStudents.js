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
            <span className="eyebrow">Student Records</span>
            <h2>Students</h2>
            <p className="hero-lead">Class select karo aur us class ke student record right side me dekho.</p>
          </div>
        </div>

        <div className="student-record-board">
          <div className="student-record-board__left">
            <div className="student-panel-heading">
              <h3>Filter by Student</h3>
            </div>

            <div className="student-filter-stack">
              <div className="field-group">
                <label htmlFor="student-filter-school">School</label>
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
                <label htmlFor="student-filter-class">Class</label>
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

            <div className="student-filter-note">
              <strong>{selectedClass === "all" ? "All Students" : formatClassLabel(selectedClass)}</strong>
              <span>{filteredStudents.length} students visible</span>
            </div>
          </div>

          <div className="student-record-board__right">
            <div className="student-panel-heading">
              <h3>
                {selectedClass === "all"
                  ? "Student Record List"
                  : `${formatClassLabel(selectedClass)} Student Record`}
              </h3>
              <p>List of students</p>
            </div>

            {isLoading ? (
              <p className="empty-state">Students load ho rahe hain...</p>
            ) : students.length === 0 ? (
              <p className="empty-state">No students found yet.</p>
            ) : filteredStudents.length === 0 ? (
              <div className="student-empty-card">
                <h3>No students found for this class.</h3>
                <p className="section-caption">Class change karke phir dekhein.</p>
              </div>
            ) : (
              <div className="student-list-panel">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="student-record-item">
                    <div className="student-record-main">
                      <div>
                        <strong>{student.name}</strong>
                        <span>
                          {student.student_code || "-"} | Class {student.class} {student.section} | Roll {student.roll_no}
                        </span>
                        <span>{student.school_name || "-"}</span>
                      </div>
                      <div className="student-record-fee">
                        <strong>Rs. {Number(student.due_fee || 0).toFixed(2)}</strong>
                        <span className="capitalize">{student.fee_status}</span>
                      </div>
                    </div>

                    {!teacherSession?.id ? (
                      <div className="student-record-actions">
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
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}
        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}
      </div>
    </div>
  );
}

export default ViewStudents;
