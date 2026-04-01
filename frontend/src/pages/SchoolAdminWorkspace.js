import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api";
import { clearAdminSession } from "../session";
import "../styles/appShell.css";

const sectionOptions = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payment Management" },
  { id: "classPayments", label: "Class-wise Payments" },
  { id: "admissions", label: "Admissions" },
  { id: "teachers", label: "Teachers" },
  { id: "classes", label: "Classes" },
  { id: "studentReport", label: "Student Report" },
];

const quickLinks = [
  {
    title: "Add Student",
    description: "Create new student records for this campus.",
    path: "/add-student",
  },
  {
    title: "View Students",
    description: "Review roster, fee status, and parent links.",
    path: "/view-students",
  },
  {
    title: "Reports Center",
    description: "Open attendance, marks, and payment reports.",
    path: "/view-reports",
  },
];

const createTeacherForm = () => ({
  id: null,
  name: "",
  email: "",
  password: "",
  assigned_class: "",
  assigned_subject: "",
});

const formatCurrency = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");

function SchoolAdminWorkspace({ admin, stats, error, isLoading }) {
  const navigate = useNavigate();
  const schoolCode = admin?.school_code || "";
  const schoolId = admin?.school_id || "";

  const [activeSection, setActiveSection] = useState("overview");
  const [workspaceStats, setWorkspaceStats] = useState(stats);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [classSummaries, setClassSummaries] = useState([]);
  const [classPaymentStudents, setClassPaymentStudents] = useState([]);

  const [teacherForm, setTeacherForm] = useState(createTeacherForm);
  const [teacherStatus, setTeacherStatus] = useState({ type: "", message: "" });
  const [classStatus, setClassStatus] = useState({ type: "", message: "" });
  const [admissionStatus, setAdmissionStatus] = useState({ type: "", message: "" });
  const [paymentStatus, setPaymentStatus] = useState({ type: "", message: "" });
  const [studentReportStatus, setStudentReportStatus] = useState({ type: "", message: "" });

  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isBootstrappingClasses, setIsBootstrappingClasses] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const [classForm, setClassForm] = useState({ class_name: "" });
  const [admissionFilter, setAdmissionFilter] = useState({ className: "", status: "" });
  const [classPaymentFilter, setClassPaymentFilter] = useState("");

  const [paymentLookupCode, setPaymentLookupCode] = useState("");
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ fee_status: "unpaid", paid_fee: "" });

  const [studentReportCode, setStudentReportCode] = useState("");
  const [studentReport, setStudentReport] = useState(null);

  const classOptions = useMemo(
    () => classes.map((item) => item.class_name).filter(Boolean),
    [classes]
  );
  const activeStats = workspaceStats || stats || null;

  const admissionSummary = useMemo(() => {
    return admissions.reduce(
      (summary, item) => {
        summary.total += 1;

        if (String(item.status || "").toLowerCase() === "submitted") {
          summary.submitted += 1;
        } else {
          summary.other += 1;
        }

        return summary;
      },
      { total: 0, submitted: 0, other: 0 }
    );
  }, [admissions]);

  const dashboardCards = [
    {
      eyebrow: "Students",
      title: "Active Students",
      value: activeStats?.students ?? 0,
      note: "Students currently mapped to this school.",
      tone: "primary",
    },
    {
      eyebrow: "Teachers",
      title: "Teacher Accounts",
      value: activeStats?.teachers ?? 0,
      note: "Teacher records ready for school login.",
      tone: "neutral",
    },
    {
      eyebrow: "Classes",
      title: "Classes Ready",
      value: Math.max(Number(activeStats?.classes || 0), classOptions.length),
      note: "Class catalog available for students, teachers, and admissions.",
      tone: "primary",
    },
    {
      eyebrow: "Admissions",
      title: "Pending Admissions",
      value: activeStats?.admissions ?? 0,
      note: "Forms currently visible in the admission review queue.",
      tone: "accent",
    },
    {
      eyebrow: "Collections",
      title: "Fee Collected",
      value: formatCurrency(activeStats?.paid_fee),
      note: "Current paid fee total across active student accounts.",
      tone: "neutral",
    },
    {
      eyebrow: "Balance",
      title: "Fee Due",
      value: formatCurrency(activeStats?.due_fee),
      note: "Outstanding collection still pending for this school.",
      tone: "accent",
    },
  ];

  const loadWorkspaceStats = async () => {
    if (!schoolId) {
      return;
    }

    const { data } = await api.get(`/schools/${schoolId}/dashboard`);
    setWorkspaceStats(data.stats || null);
  };

  const loadClasses = async () => {
    const { data } = await api.get("/classes", {
      params: { schoolCode },
    });
    setClasses(data.classes || []);
  };

  const loadTeachers = async () => {
    const { data } = await api.get("/teachers", {
      params: { schoolCode },
    });
    setTeachers(data.teachers || []);
  };

  const loadAdmissions = async (filters = admissionFilter) => {
    const params = {
      schoolCode,
      ...(filters.className ? { className: filters.className } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };
    const { data } = await api.get("/admissions", { params });
    setAdmissions(data.admissions || []);
  };

  const loadClassSummaries = async (className = classPaymentFilter) => {
    const params = {
      schoolCode,
      ...(className ? { className } : {}),
    };
    const requests = [api.get("/payments/class-summary", { params })];

    if (className) {
      requests.push(
        api.get("/students", {
          params,
        })
      );
    }

    const [summaryResponse, studentsResponse] = await Promise.all(requests);
    setClassSummaries(summaryResponse.data.classes || []);
    setClassPaymentStudents(studentsResponse?.data?.students || []);
  };

  const fetchStudentBundle = async (studentCode) => {
    const normalizedCode = String(studentCode || "").trim().toUpperCase();

    if (!normalizedCode) {
      throw new Error("Student code is required");
    }

    const [studentResponse, feeResponse] = await Promise.all([
      api.get(`/student/${normalizedCode}`, {
        params: { schoolCode },
      }),
      api.get(`/student-fee/${normalizedCode}`, {
        params: { schoolCode },
      }),
    ]);

    return {
      student: studentResponse.data.student || null,
      fee: feeResponse.data.fee || null,
      installments: feeResponse.data.installments || [],
      payments: feeResponse.data.payments || [],
    };
  };

  useEffect(() => {
    setWorkspaceStats(stats || null);
  }, [stats]);

  useEffect(() => {
    const loadWorkspaceData = async () => {
      try {
        await Promise.all([
          loadWorkspaceStats(),
          loadClasses(),
          loadTeachers(),
          loadAdmissions(),
          loadClassSummaries(),
        ]);
      } catch (requestError) {
        const message =
          requestError.response?.data?.message || "Unable to load the principal workspace.";
        setTeacherStatus({ type: "error", message });
      }
    };

    if (schoolCode) {
      loadWorkspaceData();
    }
  }, [schoolCode]);

  useEffect(() => {
    if (!schoolCode) {
      return;
    }

    const syncAdmissions = async () => {
      try {
        await loadAdmissions(admissionFilter);
        setAdmissionStatus({ type: "", message: "" });
      } catch (requestError) {
        setAdmissionStatus({
          type: "error",
          message:
            requestError.response?.data?.message || "Unable to load admission forms for this filter.",
        });
      }
    };

    syncAdmissions();
  }, [schoolCode, admissionFilter.className, admissionFilter.status]);

  useEffect(() => {
    if (!schoolCode) {
      return;
    }

    const syncClassSummary = async () => {
      try {
        await loadClassSummaries(classPaymentFilter);
        setPaymentStatus((current) =>
          current.type === "error" && current.message.includes("class summary")
            ? { type: "", message: "" }
            : current
        );
      } catch (requestError) {
        setPaymentStatus({
          type: "error",
          message:
            requestError.response?.data?.message || "Unable to load class summary for payments.",
        });
      }
    };

    syncClassSummary();
  }, [schoolCode, classPaymentFilter]);

  const resetTeacherForm = () => {
    setTeacherForm(createTeacherForm());
  };

  const handleTeacherField = (field) => (event) => {
    setTeacherForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSaveTeacher = async () => {
    if (!teacherForm.name.trim() || !teacherForm.email.trim()) {
      setTeacherStatus({ type: "error", message: "Teacher name and email are required." });
      return;
    }

    if (!teacherForm.id && !teacherForm.password) {
      setTeacherStatus({ type: "error", message: "Password is required for a new teacher." });
      return;
    }

    setIsSavingTeacher(true);
    setTeacherStatus({ type: "", message: "" });

    try {
      const payload = {
        school_id: schoolId,
        schoolCode,
        name: teacherForm.name.trim(),
        email: teacherForm.email.trim(),
        assigned_class: teacherForm.assigned_class,
        assigned_subject: teacherForm.assigned_subject.trim(),
      };

      if (teacherForm.password) {
        payload.password = teacherForm.password;
      }

      if (teacherForm.id) {
        await api.patch(`/teachers/${teacherForm.id}`, payload);
        setTeacherStatus({ type: "success", message: "Teacher updated successfully." });
      } else {
        await api.post("/add-teacher", payload);
        setTeacherStatus({ type: "success", message: "Teacher added successfully." });
      }

      resetTeacherForm();
      await Promise.all([loadTeachers(), loadClasses(), loadWorkspaceStats()]);
    } catch (requestError) {
      setTeacherStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to save teacher details.",
      });
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const handleEditTeacher = (teacher) => {
    setTeacherForm({
      id: teacher.id,
      name: teacher.name || "",
      email: teacher.email || "",
      password: "",
      assigned_class: teacher.assigned_class || "",
      assigned_subject: teacher.assigned_subject || "",
    });
    setTeacherStatus({ type: "", message: "" });
    setActiveSection("teachers");
  };

  const handleCreateClass = async () => {
    if (!classForm.class_name.trim()) {
      setClassStatus({ type: "error", message: "Class name is required." });
      return;
    }

    setIsCreatingClass(true);
    setClassStatus({ type: "", message: "" });

    try {
      await api.post("/classes", {
        schoolCode,
        class_name: classForm.class_name.trim(),
      });
      setClassForm({ class_name: "" });
      setClassStatus({ type: "success", message: "Class created successfully." });
      await Promise.all([loadClasses(), loadWorkspaceStats()]);
    } catch (requestError) {
      setClassStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to create class.",
      });
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleBootstrapClasses = async () => {
    setIsBootstrappingClasses(true);
    setClassStatus({ type: "", message: "" });

    try {
      await api.post("/classes/bootstrap", { schoolCode });
      setClassStatus({ type: "success", message: "Classes 1 to 12 are ready now." });
      await Promise.all([loadClasses(), loadWorkspaceStats()]);
    } catch (requestError) {
      setClassStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to create default classes.",
      });
    } finally {
      setIsBootstrappingClasses(false);
    }
  };

  const handlePaymentLookup = async () => {
    setPaymentStatus({ type: "", message: "" });

    try {
      const result = await fetchStudentBundle(paymentLookupCode);
      setPaymentRecord(result);
      setPaymentForm({
        fee_status: result.fee?.fee_status || result.student?.fee_status || "unpaid",
        paid_fee: String(result.fee?.paid_fee ?? result.student?.paid_fee ?? ""),
      });
    } catch (requestError) {
      setPaymentRecord(null);
      setPaymentStatus({
        type: "error",
        message:
          requestError.response?.data?.message || requestError.message || "Student payment details could not be loaded.",
      });
    }
  };

  const handlePaymentField = (field) => (event) => {
    setPaymentForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleUpdatePaymentStatus = async () => {
    if (!paymentRecord?.student?.id) {
      setPaymentStatus({ type: "error", message: "Search a student first." });
      return;
    }

    if (
      paymentForm.fee_status === "partial" &&
      (!paymentForm.paid_fee || Number(paymentForm.paid_fee) <= 0)
    ) {
      setPaymentStatus({
        type: "error",
        message: "Enter a valid paid fee amount for partial status.",
      });
      return;
    }

    setIsUpdatingPayment(true);
    setPaymentStatus({ type: "", message: "" });

    try {
      await api.patch(`/students/${paymentRecord.student.id}/fee-status`, {
        schoolCode,
        fee_status: paymentForm.fee_status,
        paid_fee: paymentForm.fee_status === "partial" ? Number(paymentForm.paid_fee) : undefined,
      });

      const refreshed = await fetchStudentBundle(
        paymentRecord.student.student_code || paymentLookupCode
      );
      setPaymentRecord(refreshed);
      setPaymentForm({
        fee_status: refreshed.fee?.fee_status || refreshed.student?.fee_status || "unpaid",
        paid_fee: String(refreshed.fee?.paid_fee ?? refreshed.student?.paid_fee ?? ""),
      });
      setPaymentStatus({ type: "success", message: "Payment status updated successfully." });
      await Promise.all([loadClassSummaries(classPaymentFilter), loadWorkspaceStats()]);
    } catch (requestError) {
      setPaymentStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to update payment status.",
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleStudentReportLookup = async () => {
    setStudentReportStatus({ type: "", message: "" });

    try {
      const result = await fetchStudentBundle(studentReportCode);
      setStudentReport(result);
    } catch (requestError) {
      setStudentReport(null);
      setStudentReportStatus({
        type: "error",
        message:
          requestError.response?.data?.message || requestError.message || "Student report could not be loaded.",
      });
    }
  };

  return (
    <div className="page-shell">
      <div className="page-card workspace-card">
        <div className="workspace-layout">
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-top">
              <span className="eyebrow">Principal Workspace</span>
              <h2>{admin?.school_name || "School Admin Dashboard"}</h2>
              <p className="muted-copy">
                Use the school code, student code, and school-specific data views to manage this campus safely.
              </p>
              <div className="hero-meta">
                <span className="meta-chip">{admin?.name || "School Admin"}</span>
                {schoolCode ? <span className="meta-chip">{schoolCode}</span> : null}
              </div>
            </div>

            <div className="workspace-nav">
              {sectionOptions.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`workspace-nav-button ${
                    activeSection === section.id ? "workspace-nav-button--active" : ""
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="workspace-sidebar-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  clearAdminSession();
                  navigate("/admin-login");
                }}
              >
                Logout
              </button>
            </div>
          </aside>

          <main className="workspace-main">
            <div className="page-header workspace-header">
              <div className="header-copy">
                <span className="eyebrow">School Code Isolated</span>
                <h1>Principal Dashboard</h1>
                <p className="hero-lead">
                  Manage classes, admissions, teachers, student payments, and reports for{" "}
                  {admin?.school_name ? `${admin.school_name} (${schoolCode})` : "your school"}.
                </p>
                <div className="hero-meta">
                  <span className="meta-chip">Admin / Principal only</span>
                  <span className="meta-chip">{activeStats?.students ?? 0} students</span>
                  <span className="meta-chip">{activeStats?.teachers ?? 0} teachers</span>
                </div>
              </div>
            </div>

            {error ? <p className="status-message error">{error}</p> : null}

            {activeSection === "overview" ? (
              <div className="section-stack">
                <div className="hero-grid">
                  <div className="hero-panel hero-panel--accent">
                    <span className="card-eyebrow">School Pulse</span>
                    <h3>Students, collections, admissions, and classes stay connected here.</h3>
                    <p className="muted-copy">
                      This dashboard extends your existing school admin flow without changing current student, teacher, or parent logins.
                    </p>
                    <div className="highlight-grid">
                      <div className="highlight-card">
                        <span className="highlight-value">
                          {Math.max(Number(activeStats?.classes || 0), classOptions.length)}
                        </span>
                        <span className="highlight-label">classes available</span>
                      </div>
                      <div className="highlight-card">
                        <span className="highlight-value">{activeStats?.admissions ?? 0}</span>
                        <span className="highlight-label">admissions to review</span>
                      </div>
                      <div className="highlight-card">
                        <span className="highlight-value">{formatCurrency(activeStats?.due_fee)}</span>
                        <span className="highlight-label">current fee due</span>
                      </div>
                    </div>
                  </div>

                  <div className="hero-panel">
                    <span className="card-eyebrow">Quick Access</span>
                    <h3>Keep your current tools close</h3>
                    <div className="action-grid compact-action-grid">
                      {quickLinks.map((item) => (
                        <Link key={item.path} className="quick-link" to={item.path}>
                          <div className="info-card action-card compact-card">
                            <h4>{item.title}</h4>
                            <p>{item.description}</p>
                            <span className="card-link">Open</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <p className="empty-state">Dashboard summary load ho rahi hai...</p>
                ) : (
                  <div className="stats-grid">
                    {dashboardCards.map((item) => (
                      <div
                        key={item.title}
                        className={`info-card stat-card stat-card--tone-${item.tone}`}
                      >
                        <span className="card-eyebrow">{item.eyebrow}</span>
                        <h3>{item.title}</h3>
                        <p
                          className="metric"
                          style={{ fontSize: typeof item.value === "string" ? "1.4rem" : undefined }}
                        >
                          {item.value}
                        </p>
                        <p className="metric-note">{item.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeSection === "payments" ? (
              <div className="section-stack">
                <div className="section-heading">
                  <div>
                    <h3>Payment Management</h3>
                    <p className="section-caption">
                      Search a student by generated student code, review fee details, and update the current payment status.
                    </p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="toolbar-row">
                    <div className="field-group grow-field">
                      <label htmlFor="payment-student-code">Student Code</label>
                      <input
                        id="payment-student-code"
                        value={paymentLookupCode}
                        onChange={(event) => setPaymentLookupCode(event.target.value)}
                        placeholder="Enter student code"
                      />
                    </div>
                    <button className="primary-button" onClick={handlePaymentLookup}>
                      Search Student
                    </button>
                  </div>

                  {paymentStatus.message ? (
                    <p className={`status-message ${paymentStatus.type}`}>{paymentStatus.message}</p>
                  ) : null}
                </div>

                {paymentRecord?.student ? (
                  <div className="summary-grid">
                    <div className="info-card">
                      <span className="card-eyebrow">Student Snapshot</span>
                      <div className="detail-list">
                        <div className="detail-item">
                          <span>Student</span>
                          <strong>{paymentRecord.student.name}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Student Code</span>
                          <strong>{paymentRecord.student.student_code}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Class</span>
                          <strong>
                            {paymentRecord.student.class} {paymentRecord.student.section}
                          </strong>
                        </div>
                        <div className="detail-item">
                          <span>Fee Status</span>
                          <strong className="capitalize">{paymentRecord.student.fee_status}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="info-card">
                      <span className="card-eyebrow">Current Fee Position</span>
                      <div className="detail-list">
                        <div className="detail-item">
                          <span>Annual Fee</span>
                          <strong>{formatCurrency(paymentRecord.fee?.annual_fee)}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Paid Fee</span>
                          <strong>{formatCurrency(paymentRecord.fee?.paid_fee)}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Due Fee</span>
                          <strong>{formatCurrency(paymentRecord.fee?.due_fee)}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Payment Entries</span>
                          <strong>{paymentRecord.payments.length}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="info-card span-all">
                      <span className="card-eyebrow">Update Payment Status</span>
                      <div className="form-grid">
                        <div className="field-group">
                          <label htmlFor="payment-status-field">Fee Status</label>
                          <select
                            id="payment-status-field"
                            value={paymentForm.fee_status}
                            onChange={handlePaymentField("fee_status")}
                          >
                            <option value="paid">Paid</option>
                            <option value="partial">Partial</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                        </div>
                        <div className="field-group">
                          <label htmlFor="payment-paid-field">Paid Fee Amount</label>
                          <input
                            id="payment-paid-field"
                            type="number"
                            min="0"
                            value={paymentForm.paid_fee}
                            onChange={handlePaymentField("paid_fee")}
                            disabled={paymentForm.fee_status !== "partial"}
                            placeholder="Required only for partial status"
                          />
                        </div>
                      </div>

                      <div className="button-row">
                        <button
                          className="primary-button"
                          onClick={handleUpdatePaymentStatus}
                          disabled={isUpdatingPayment}
                        >
                          {isUpdatingPayment ? "Updating..." : "Update Status"}
                        </button>
                      </div>
                    </div>

                    <div className="info-card span-all table-panel">
                      <div className="table-panel-header">
                        <h3>Payment History</h3>
                        <p className="section-caption">
                          Existing payment records remain visible even when the current fee status is updated manually.
                        </p>
                      </div>
                      {paymentRecord.payments.length ? (
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th>Reference</th>
                                <th>Notes</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentRecord.payments.map((payment) => (
                                <tr key={payment.id}>
                                  <td>{formatCurrency(payment.amount)}</td>
                                  <td>{payment.payment_method}</td>
                                  <td className="capitalize">{payment.status}</td>
                                  <td>{payment.transaction_ref}</td>
                                  <td>{payment.notes || "-"}</td>
                                  <td>{formatDate(payment.paid_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="table-panel-header">
                          <p className="empty-state">No payment entries found for this student yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeSection === "classPayments" ? (
              <div className="section-stack">
                <div className="section-heading">
                  <div>
                    <h3>Class-wise Payment View</h3>
                    <p className="section-caption">
                      Filter class-wise fee health and review payment summary by class for this school only.
                    </p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="toolbar-row">
                    <div className="field-group grow-field">
                      <label htmlFor="class-payment-filter">Class Filter</label>
                      <select
                        id="class-payment-filter"
                        value={classPaymentFilter}
                        onChange={(event) => setClassPaymentFilter(event.target.value)}
                      >
                        <option value="">All Classes</option>
                        {classOptions.map((className) => (
                          <option key={className} value={className}>
                            Class {className}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="stats-grid">
                  {classSummaries.map((summary) => (
                    <div key={summary.class_name} className="info-card stat-card stat-card--tone-primary">
                      <span className="card-eyebrow">Class {summary.class_name}</span>
                      <h3>{summary.total_students} Students</h3>
                      <div className="detail-list">
                        <div className="detail-item">
                          <span>Paid</span>
                          <strong>{summary.paid_students}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Partial</span>
                          <strong>{summary.partial_students}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Unpaid</span>
                          <strong>{summary.unpaid_students}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Collected</span>
                          <strong>{formatCurrency(summary.paid_fee)}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Due</span>
                          <strong>{formatCurrency(summary.due_fee)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!classSummaries.length ? (
                  <p className="empty-state">No class-wise payment summary available for this filter.</p>
                ) : null}

                {classPaymentFilter ? (
                  <div className="info-card table-panel">
                    <div className="table-panel-header">
                      <h3>Filtered Students</h3>
                      <p className="section-caption">
                        Students currently visible under Class {classPaymentFilter}.
                      </p>
                    </div>
                    {classPaymentStudents.length ? (
                      <div className="table-wrapper">
                        <table className="data-table wide-table">
                          <thead>
                            <tr>
                              <th>Student Code</th>
                              <th>Name</th>
                              <th>Section</th>
                              <th>Annual Fee</th>
                              <th>Paid Fee</th>
                              <th>Due Fee</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classPaymentStudents.map((student) => (
                              <tr key={student.id}>
                                <td>{student.student_code}</td>
                                <td>{student.name}</td>
                                <td>{student.section}</td>
                                <td>{formatCurrency(student.annual_fee)}</td>
                                <td>{formatCurrency(student.paid_fee)}</td>
                                <td>{formatCurrency(student.due_fee)}</td>
                                <td className="capitalize">{student.fee_status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="table-panel-header">
                        <p className="empty-state">No students found for the selected class.</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeSection === "admissions" ? (
              <div className="section-stack">
                <div className="section-heading">
                  <div>
                    <h3>Admission Forms</h3>
                    <p className="section-caption">
                      Review school-specific admission forms and narrow the queue by class or status.
                    </p>
                  </div>
                </div>

                <div className="card-grid">
                  <div className="info-card stat-card stat-card--tone-primary">
                    <span className="card-eyebrow">Forms</span>
                    <h3>Total Forms</h3>
                    <p className="metric">{admissionSummary.total}</p>
                    <p className="metric-note">Admission requests currently visible in this filtered view.</p>
                  </div>
                  <div className="info-card stat-card stat-card--tone-accent">
                    <span className="card-eyebrow">Submitted</span>
                    <h3>Submitted Forms</h3>
                    <p className="metric">{admissionSummary.submitted}</p>
                    <p className="metric-note">Forms still waiting for the next admin action.</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor="admission-class-filter">Class</label>
                      <select
                        id="admission-class-filter"
                        value={admissionFilter.className}
                        onChange={(event) =>
                          setAdmissionFilter((current) => ({
                            ...current,
                            className: event.target.value,
                          }))
                        }
                      >
                        <option value="">All Classes</option>
                        {classOptions.map((className) => (
                          <option key={className} value={className}>
                            Class {className}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor="admission-status-filter">Status</label>
                      <select
                        id="admission-status-filter"
                        value={admissionFilter.status}
                        onChange={(event) =>
                          setAdmissionFilter((current) => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                      >
                        <option value="">All Status</option>
                        <option value="submitted">Submitted</option>
                      </select>
                    </div>
                  </div>

                  {admissionStatus.message ? (
                    <p className={`status-message ${admissionStatus.type}`}>{admissionStatus.message}</p>
                  ) : null}
                </div>

                <div className="info-card table-panel">
                  <div className="table-panel-header">
                    <h3>Admission Queue</h3>
                    <p className="section-caption">Every row stays isolated to the current school code.</p>
                  </div>

                  {admissions.length ? (
                    <div className="table-wrapper">
                      <table className="data-table wide-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Class</th>
                            <th>Parent</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Reference</th>
                            <th>School Code</th>
                            <th>Submitted On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admissions.map((admission) => (
                            <tr key={admission.id}>
                              <td>{admission.student_name}</td>
                              <td>{admission.class_name}</td>
                              <td>{admission.parent_name || "-"}</td>
                              <td>{admission.parent_phone || "-"}</td>
                              <td className="capitalize">{admission.status}</td>
                              <td>{admission.reference_number}</td>
                              <td>{admission.school_code || schoolCode}</td>
                              <td>{formatDate(admission.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="table-panel-header">
                      <p className="empty-state">No admission forms match the selected filter.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {activeSection === "teachers" ? (
              <div className="section-stack">
                <div className="section-heading">
                  <div>
                    <h3>Teacher Management</h3>
                    <p className="section-caption">
                      Add teachers, edit teacher records, and assign class plus subject inside this school.
                    </p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor="workspace-teacher-name">Teacher Name</label>
                      <input
                        id="workspace-teacher-name"
                        value={teacherForm.name}
                        onChange={handleTeacherField("name")}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="workspace-teacher-email">Teacher Email</label>
                      <input
                        id="workspace-teacher-email"
                        type="email"
                        value={teacherForm.email}
                        onChange={handleTeacherField("email")}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="workspace-teacher-password">
                        {teacherForm.id ? "New Password (Optional)" : "Password"}
                      </label>
                      <input
                        id="workspace-teacher-password"
                        type="password"
                        value={teacherForm.password}
                        onChange={handleTeacherField("password")}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="workspace-teacher-class">Assigned Class</label>
                      <select
                        id="workspace-teacher-class"
                        value={teacherForm.assigned_class}
                        onChange={handleTeacherField("assigned_class")}
                      >
                        <option value="">Select Class</option>
                        {classOptions.map((className) => (
                          <option key={className} value={className}>
                            Class {className}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="workspace-teacher-subject">Assigned Subject</label>
                      <input
                        id="workspace-teacher-subject"
                        value={teacherForm.assigned_subject}
                        onChange={handleTeacherField("assigned_subject")}
                        placeholder="Example: Mathematics"
                      />
                    </div>
                  </div>

                  {teacherStatus.message ? (
                    <p className={`status-message ${teacherStatus.type}`}>{teacherStatus.message}</p>
                  ) : null}

                  <div className="button-row">
                    <button
                      className="primary-button"
                      onClick={handleSaveTeacher}
                      disabled={isSavingTeacher}
                    >
                      {isSavingTeacher
                        ? "Saving..."
                        : teacherForm.id
                          ? "Update Teacher"
                          : "Add Teacher"}
                    </button>
                    <button className="secondary-button" onClick={resetTeacherForm}>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="info-card table-panel">
                  <div className="table-panel-header">
                    <h3>Teacher Records</h3>
                    <p className="section-caption">
                      Edit a teacher row to update login details, class assignment, or subject assignment.
                    </p>
                  </div>

                  {teachers.length ? (
                    <div className="table-wrapper">
                      <table className="data-table wide-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Assigned Class</th>
                            <th>Assigned Subject</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teachers.map((teacher) => (
                            <tr key={teacher.id}>
                              <td>{teacher.name}</td>
                              <td>{teacher.email}</td>
                              <td>{teacher.assigned_class || "-"}</td>
                              <td>{teacher.assigned_subject || "-"}</td>
                              <td className="actions-cell">
                                <button
                                  className="secondary-button"
                                  onClick={() => handleEditTeacher(teacher)}
                                >
                                  Edit Teacher
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="table-panel-header">
                      <p className="empty-state">No teacher records available for this school yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {activeSection === "classes" ? (
              <div className="section-stack">
                <div className="section-heading">
                  <div>
                    <h3>Class Management</h3>
                    <p className="section-caption">
                      Create the class catalog used by teachers, admissions, and student records.
                    </p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="toolbar-row">
                    <div className="field-group grow-field">
                      <label htmlFor="class-name-input">Class Name</label>
                      <input
                        id="class-name-input"
                        value={classForm.class_name}
                        onChange={(event) =>
                          setClassForm({
                            class_name: event.target.value,
                          })
                        }
                        placeholder="Example: 9"
                      />
                    </div>
                    <button
                      className="primary-button"
                      onClick={handleCreateClass}
                      disabled={isCreatingClass}
                    >
                      {isCreatingClass ? "Saving..." : "Create Class"}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={handleBootstrapClasses}
                      disabled={isBootstrappingClasses}
                    >
                      {isBootstrappingClasses ? "Creating..." : "Create 1 To 12"}
                    </button>
                  </div>

                  {classStatus.message ? (
                    <p className={`status-message ${classStatus.type}`}>{classStatus.message}</p>
                  ) : null}
                </div>

                <div className="stats-grid">
                  {classes.map((item) => (
                    <div key={item.id} className="info-card stat-card stat-card--tone-primary">
                      <span className="card-eyebrow">Class Catalog</span>
                      <h3>Class {item.class_name}</h3>
                      <p className="metric metric--compact">{item.school_code}</p>
                      <p className="metric-note">Ready to assign in teacher and admission flows.</p>
                    </div>
                  ))}
                </div>

                {!classes.length ? (
                  <p className="empty-state">No classes created yet. Start by adding one class or generate 1 to 12.</p>
                ) : null}
              </div>
            ) : null}

            {activeSection === "studentReport" ? (
              <div className="section-stack">
                <div className="section-heading">
                  <div>
                    <h3>Student Report</h3>
                    <p className="section-caption">
                      Search a student by student code and review full profile details with current payment status.
                    </p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="toolbar-row">
                    <div className="field-group grow-field">
                      <label htmlFor="student-report-code">Student Code</label>
                      <input
                        id="student-report-code"
                        value={studentReportCode}
                        onChange={(event) => setStudentReportCode(event.target.value)}
                        placeholder="Enter student code"
                      />
                    </div>
                    <button className="primary-button" onClick={handleStudentReportLookup}>
                      Search Report
                    </button>
                  </div>

                  {studentReportStatus.message ? (
                    <p className={`status-message ${studentReportStatus.type}`}>
                      {studentReportStatus.message}
                    </p>
                  ) : null}
                </div>

                {studentReport?.student ? (
                  <div className="summary-grid">
                    <div className="info-card">
                      <span className="card-eyebrow">Student Details</span>
                      <div className="detail-list">
                        <div className="detail-item">
                          <span>Name</span>
                          <strong>{studentReport.student.name}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Student Code</span>
                          <strong>{studentReport.student.student_code}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Class</span>
                          <strong>
                            {studentReport.student.class} {studentReport.student.section}
                          </strong>
                        </div>
                        <div className="detail-item">
                          <span>Roll Number</span>
                          <strong>{studentReport.student.roll_no}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Email</span>
                          <strong>{studentReport.student.email}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="info-card">
                      <span className="card-eyebrow">Parent And Fee Status</span>
                      <div className="detail-list">
                        <div className="detail-item">
                          <span>Parent</span>
                          <strong>{studentReport.student.parent_name || "-"}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Parent Email</span>
                          <strong>{studentReport.student.parent_email || "-"}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Fee Status</span>
                          <strong className="capitalize">{studentReport.student.fee_status}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Paid / Due</span>
                          <strong>
                            {formatCurrency(studentReport.fee?.paid_fee)} /{" "}
                            {formatCurrency(studentReport.fee?.due_fee)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="info-card">
                      <span className="card-eyebrow">School And Payments</span>
                      <div className="detail-list">
                        <div className="detail-item">
                          <span>School</span>
                          <strong>{studentReport.student.school_name || "-"}</strong>
                        </div>
                        <div className="detail-item">
                          <span>School Code</span>
                          <strong>{studentReport.student.school_code || schoolCode}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Annual Fee</span>
                          <strong>{formatCurrency(studentReport.fee?.annual_fee)}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Payment Entries</span>
                          <strong>{studentReport.payments.length}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

export default SchoolAdminWorkspace;
