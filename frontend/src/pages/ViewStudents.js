import React, { useEffect, useState } from "react";

import api from "../api";
import { getAdminSession, getTeacherSession } from "../session";
import "../styles/appShell.css";

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
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [linkValues, setLinkValues] = useState({});
  const [savingStudentId, setSavingStudentId] = useState(null);
  const feeSummary = students.reduce(
    (summary, student) => {
      summary.annual += Number(student.annual_fee || 0);
      summary.paid += Number(student.paid_fee || 0);
      summary.due += Number(student.due_fee || 0);

      if (String(student.fee_status || "").toLowerCase() !== "paid") {
        summary.pending += 1;
      }

      return summary;
    },
    {
      annual: 0,
      paid: 0,
      due: 0,
      pending: 0,
    }
  );

  useEffect(() => {
    if (lockedSchoolId) {
      setSelectedSchool(String(lockedSchoolId));
    }
  }, [lockedSchoolId]);

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
            <span className="eyebrow">Student Roster</span>
            <h2>Students</h2>
            <p className="hero-lead">Review the student roster, school assignment, and fee payment status.</p>
            <div className="hero-meta">
              <span className="meta-chip">{students.length} students</span>
              <span className="meta-chip">{parents.length} parent accounts</span>
              {lockedSchoolId ? <span className="meta-chip">School locked</span> : null}
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div className="card-grid">
            <div className="info-card stat-card stat-card--tone-primary">
              <span className="card-eyebrow">Roster</span>
              <h3>Total Students</h3>
              <p className="metric">{students.length}</p>
              <p className="metric-note">Students currently visible in this filtered roster.</p>
            </div>
            <div className="info-card stat-card stat-card--tone-neutral">
              <span className="card-eyebrow">Collections</span>
              <h3>Pending Fee Students</h3>
              <p className="metric">{feeSummary.pending}</p>
              <p className="metric-note">Students whose fee status is not yet fully paid.</p>
            </div>
            <div className="info-card stat-card stat-card--tone-accent">
              <span className="card-eyebrow">Due Amount</span>
              <h3>Outstanding Fee</h3>
              <p className="metric">Rs. {feeSummary.due.toFixed(2)}</p>
              <p className="metric-note">Total balance still pending across listed students.</p>
            </div>
          </div>

          <div className="info-card">
            <div className="section-heading">
              <div>
                <h3>Filter Students</h3>
                <p className="section-caption">Narrow the roster to one school before managing parent links.</p>
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
            </div>
          </div>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}
        {status.message ? <p className={`status-message ${status.type}`}>{status.message}</p> : null}

        {isLoading ? (
          <p className="empty-state">Students load ho rahe hain...</p>
        ) : students.length === 0 ? (
          <p className="empty-state">No students found yet.</p>
        ) : (
          <div className="info-card table-panel">
            <div className="table-panel-header">
              <span className="card-eyebrow">Roster Table</span>
              <h3>Student Records</h3>
              <p className="section-caption">Scroll horizontally on smaller screens to review the complete roster.</p>
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
                  {students.map((student) => (
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
