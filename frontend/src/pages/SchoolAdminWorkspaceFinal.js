import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

import api from "../api";
import { clearAdminSession } from "../session";
import "../styles/appShell.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const sectionOptions = [
  { id: "overview", label: "Overview", detail: "Executive KPIs and trends" },
  { id: "students", label: "Students", detail: "Profiles, filters, and fee posture" },
  { id: "attendance", label: "Attendance", detail: "Daily presence insight" },
  { id: "academics", label: "Gradebook", detail: "Marks and subject performance" },
  { id: "finance", label: "Finance", detail: "Collections and payment control" },
  { id: "admissions", label: "Admissions", detail: "Intake queue and parent handoff" },
  { id: "timetable", label: "Timetable", detail: "Class schedule planning" },
  { id: "notifications", label: "Notifications", detail: "Announcements and messaging log" },
  { id: "operations", label: "Staff & Classes", detail: "Teacher setup and class catalog" },
  { id: "governance", label: "Governance", detail: "RBAC, UX, and rollout priorities" },
];

const quickLinks = [
  {
    title: "Add Student",
    description: "Create new student records with parent and fee details.",
    path: "/add-student",
  },
  {
    title: "View Students",
    description: "Open the full roster and current student workflows.",
    path: "/view-students",
  },
  {
    title: "Reports Center",
    description: "Jump to attendance, marks, and payment reports.",
    path: "/view-reports",
  },
];

const roleAccessMatrix = [
  {
    role: "Admin",
    access:
      "Full access to students, attendance, gradebook, fees, notifications, and settings.",
  },
  {
    role: "Teacher",
    access: "Manage attendance and grades, while viewing student records and timetable.",
  },
  {
    role: "Office Staff",
    access: "Handle fee tracking, records maintenance, and front-desk operations.",
  },
  {
    role: "Parents",
    access: "View-only access to their child profile, attendance, grades, and dues.",
  },
];

const roadmapItems = [
  {
    phase: "Phase 1",
    window: "Core build",
    summary: "Student profiles, teacher setup, attendance, and gradebook foundations.",
  },
  {
    phase: "Phase 2",
    window: "Operational maturity",
    summary: "Timetable, fees, notifications, and class-wise financial reporting.",
  },
  {
    phase: "Phase 3",
    window: "Governance",
    summary: "RBAC, audit logs, parent portal readiness, and secure workflows.",
  },
  {
    phase: "Phase 4",
    window: "Final polish",
    summary: "Accessibility, responsive refinement, testing, deployment, and training.",
  },
];

const featurePriorities = [
  {
    title: "Student profile consolidation",
    priority: "High",
    complexity: "Medium",
  },
  {
    title: "Attendance operations with review widgets",
    priority: "High",
    complexity: "Medium",
  },
  {
    title: "Gradebook insight and exam performance surfaces",
    priority: "High",
    complexity: "High",
  },
  {
    title: "Fee control with class-wise collection tracking",
    priority: "High",
    complexity: "Medium",
  },
];

const uxStandards = [
  "Responsive layouts with collapsible navigation and scroll-safe tables.",
  "Accessible labels, focus states, contrast-safe color choices, and readable hierarchy.",
  "Role-based navigation so teachers, admins, and parents only see relevant actions.",
  "Clear success and error feedback after save, update, and lookup actions.",
];

const availablePermissions = [
  "manage_students",
  "manage_attendance",
  "manage_grades",
  "manage_fees",
  "manage_notifications",
  "manage_timetable",
  "manage_roles",
];

const createTeacherForm = () => ({
  id: null,
  name: "",
  email: "",
  password: "",
  assigned_class: "",
  assigned_subject: "",
});

const safeNumber = (value) => Number(value || 0);
const formatCurrency = (value) => `Rs. ${safeNumber(value).toFixed(2)}`;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");
const formatPercent = (value) => `${safeNumber(value).toFixed(1)}%`;
const normalizeText = (value) => String(value || "").trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const hasPositiveValues = (values) => values.some((value) => safeNumber(value) > 0);

const compareClassNames = (left, right) => {
  const leftText = normalizeText(left);
  const rightText = normalizeText(right);
  const leftNumber = Number(leftText);
  const rightNumber = Number(rightText);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber || leftText.localeCompare(rightText, undefined, { numeric: true });
  }

  return leftText.localeCompare(rightText, undefined, { numeric: true, sensitivity: "base" });
};

const getStatusTone = (value) => {
  const normalized = normalizeKey(value);

  if (["paid", "present", "active", "completed", "linked"].includes(normalized)) {
    return "success";
  }

  if (["partial", "pending", "in-progress", "submitted"].includes(normalized)) {
    return "warning";
  }

  if (["unpaid", "absent", "inactive", "blocked", "overdue"].includes(normalized)) {
    return "danger";
  }

  return "neutral";
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: "#526078",
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
      ticks: {
        color: "#526078",
      },
    },
  },
};

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  elements: {
    line: {
      tension: 0.34,
      borderWidth: 3,
    },
    point: {
      radius: 4,
      hoverRadius: 5,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: "#526078",
      },
    },
    y: {
      beginAtZero: true,
      max: 100,
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
      ticks: {
        color: "#526078",
        callback: (value) => `${value}%`,
      },
    },
  },
};

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        usePointStyle: true,
        color: "#526078",
        padding: 16,
      },
    },
  },
};

const stackedBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        usePointStyle: true,
        color: "#526078",
        padding: 16,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      grid: {
        display: false,
      },
      ticks: {
        color: "#526078",
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      grid: {
        color: "rgba(148, 163, 184, 0.18)",
      },
      ticks: {
        color: "#526078",
      },
    },
  },
};

function StatusPill({ value }) {
  return <span className={`status-pill status-pill--${getStatusTone(value)}`}>{value || "-"}</span>;
}

function MetricCard({ eyebrow, title, value, note, tone = "primary" }) {
  return (
    <div className={`info-card stat-card stat-card--tone-${tone}`}>
      <span className="card-eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p className="metric" style={{ fontSize: typeof value === "string" ? "1.5rem" : undefined }}>
        {value}
      </p>
      <p className="metric-note">{note}</p>
    </div>
  );
}

function EmptyChart({ message }) {
  return <p className="chart-empty">{message}</p>;
}

function SchoolAdminWorkspaceFinal({ admin, stats, error, isLoading }) {
  const navigate = useNavigate();
  const schoolCode = admin?.school_code || "";
  const schoolId = admin?.school_id || "";

  const [activeSection, setActiveSection] = useState("overview");
  const [workspaceStats, setWorkspaceStats] = useState(stats);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [parents, setParents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [workspaceStatus, setWorkspaceStatus] = useState({ type: "", message: "" });
  const [isSyncingWorkspace, setIsSyncingWorkspace] = useState(false);

  const [teacherForm, setTeacherForm] = useState(createTeacherForm);
  const [teacherStatus, setTeacherStatus] = useState({ type: "", message: "" });
  const [classStatus, setClassStatus] = useState({ type: "", message: "" });
  const [paymentStatus, setPaymentStatus] = useState({ type: "", message: "" });
  const [selectedStudentStatus, setSelectedStudentStatus] = useState({ type: "", message: "" });
  const [notificationStatus, setNotificationStatus] = useState({ type: "", message: "" });
  const [timetableStatus, setTimetableStatus] = useState({ type: "", message: "" });
  const [roleStatus, setRoleStatus] = useState({ type: "", message: "" });
  const [deliveryStatus, setDeliveryStatus] = useState({ type: "", message: "" });

  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isBootstrappingClasses, setIsBootstrappingClasses] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isLoadingStudentBundle, setIsLoadingStudentBundle] = useState(false);
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [isSavingTimetable, setIsSavingTimetable] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const [classForm, setClassForm] = useState({ class_name: "" });
  const [admissionFilter, setAdmissionFilter] = useState({ className: "", status: "" });
  const [studentFilters, setStudentFilters] = useState({
    className: "",
    feeStatus: "",
    query: "",
  });
  const [classPaymentFilter, setClassPaymentFilter] = useState("");
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState("");
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState("");
  const [attendanceViewMode, setAttendanceViewMode] = useState("school");

  const [paymentLookupCode, setPaymentLookupCode] = useState("");
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ fee_status: "unpaid", paid_fee: "" });
  const [notificationForm, setNotificationForm] = useState({
    id: null,
    title: "",
    message: "",
    audience: "all",
    class_name: "",
  });
  const [timetableForm, setTimetableForm] = useState({
    id: null,
    class_name: "",
    day_of_week: "mon",
    start_time: "",
    end_time: "",
    subject_name: "",
    teacher_name: "",
    room_no: "",
  });
  const [roleForm, setRoleForm] = useState({
    id: null,
    name: "",
    description: "",
    permissions: ["manage_attendance", "manage_grades"],
  });

  const [selectedStudentCode, setSelectedStudentCode] = useState("");
  const [selectedStudentBundle, setSelectedStudentBundle] = useState(null);

  const loadWorkspaceStats = useCallback(async () => {
    if (!schoolId) {
      return null;
    }

    const { data } = await api.get(`/schools/${schoolId}/dashboard`);
    setWorkspaceStats(data.stats || null);
    return data.stats || null;
  }, [schoolId]);

  const loadClasses = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/classes", {
      params: { schoolCode },
    });
    setClasses(data.classes || []);
    return data.classes || [];
  }, [schoolCode]);

  const loadTeachers = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/teachers", {
      params: { schoolCode },
    });
    setTeachers(data.teachers || []);
    return data.teachers || [];
  }, [schoolCode]);

  const loadAdmissions = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/admissions", {
      params: { schoolCode },
    });
    setAdmissions(data.admissions || []);
    return data.admissions || [];
  }, [schoolCode]);

  const loadStudents = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/students", {
      params: { schoolCode },
    });
    setStudents(data.students || []);
    return data.students || [];
  }, [schoolCode]);

  const loadAttendance = useCallback(async () => {
    if (!schoolId) {
      return [];
    }

    const { data } = await api.get("/attendance", {
      params: { schoolId },
    });
    setAttendance(data.attendance || []);
    return data.attendance || [];
  }, [schoolId]);

  const loadMarks = useCallback(async () => {
    if (!schoolId) {
      return [];
    }

    const { data } = await api.get("/marks", {
      params: { schoolId },
    });
    setMarks(data.marks || []);
    return data.marks || [];
  }, [schoolId]);

  const loadParents = useCallback(async () => {
    if (!schoolId) {
      return [];
    }

    const { data } = await api.get("/parents", {
      params: { schoolId },
    });
    setParents(data.parents || []);
    return data.parents || [];
  }, [schoolId]);

  const loadPayments = useCallback(async () => {
    if (!schoolId) {
      return [];
    }

    const { data } = await api.get("/payments", {
      params: { schoolId },
    });
    setPayments(data.payments || []);
    return data.payments || [];
  }, [schoolId]);

  const loadNotifications = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/notifications", {
      params: { schoolCode },
    });
    setNotifications(data.notifications || []);
    return data.notifications || [];
  }, [schoolCode]);

  const loadTimetables = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/timetables", {
      params: { schoolCode },
    });
    setTimetables(data.timetables || []);
    return data.timetables || [];
  }, [schoolCode]);

  const loadRoles = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/roles", {
      params: { schoolCode },
    });
    setRoles(data.roles || []);
    return data.roles || [];
  }, [schoolCode]);

  const loadAuditLogs = useCallback(async () => {
    if (!schoolCode) {
      return [];
    }

    const { data } = await api.get("/audit-logs", {
      params: { schoolCode },
    });
    setAuditLogs(data.audit_logs || []);
    return data.audit_logs || [];
  }, [schoolCode]);

  const refreshWorkspaceData = useCallback(async () => {
    if (!schoolId || !schoolCode) {
      return;
    }

    setIsSyncingWorkspace(true);

    try {
      await Promise.all([
        loadWorkspaceStats(),
        loadClasses(),
        loadTeachers(),
        loadAdmissions(),
        loadStudents(),
        loadAttendance(),
        loadMarks(),
        loadParents(),
        loadPayments(),
        loadNotifications(),
        loadTimetables(),
        loadRoles(),
        loadAuditLogs(),
      ]);
      setWorkspaceStatus({ type: "", message: "" });
    } catch (requestError) {
      setWorkspaceStatus({
        type: "error",
        message:
          requestError.response?.data?.message || "Unable to load the principal workspace.",
      });
    } finally {
      setIsSyncingWorkspace(false);
    }
  }, [
    loadAdmissions,
    loadAuditLogs,
    loadAttendance,
    loadClasses,
    loadMarks,
    loadNotifications,
    loadParents,
    loadPayments,
    loadRoles,
    loadStudents,
    loadTeachers,
    loadTimetables,
    loadWorkspaceStats,
    schoolCode,
    schoolId,
  ]);

  const fetchStudentBundle = useCallback(
    async (studentCode) => {
      const normalizedCode = normalizeText(studentCode).toUpperCase();

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
    },
    [schoolCode]
  );

  useEffect(() => {
    setWorkspaceStats(stats || null);
  }, [stats]);

  useEffect(() => {
    refreshWorkspaceData();
  }, [refreshWorkspaceData]);

  const activeStats = workspaceStats || stats || null;

  const classOptions = useMemo(() => {
    const merged = new Set();

    classes.forEach((item) => merged.add(normalizeText(item.class_name)));
    teachers.forEach((item) => merged.add(normalizeText(item.assigned_class)));
    students.forEach((item) => merged.add(normalizeText(item.class)));
    admissions.forEach((item) => merged.add(normalizeText(item.class_name)));

    return Array.from(merged)
      .filter(Boolean)
      .sort(compareClassNames);
  }, [admissions, classes, students, teachers]);

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((admission) => {
      const matchesClass =
        !admissionFilter.className ||
        normalizeText(admission.class_name) === normalizeText(admissionFilter.className);
      const matchesStatus =
        !admissionFilter.status ||
        normalizeKey(admission.status) === normalizeKey(admissionFilter.status);

      return matchesClass && matchesStatus;
    });
  }, [admissionFilter, admissions]);

  const filteredStudents = useMemo(() => {
    const query = normalizeKey(studentFilters.query);

    return students.filter((student) => {
      const matchesClass =
        !studentFilters.className ||
        normalizeText(student.class) === normalizeText(studentFilters.className);
      const matchesFee =
        !studentFilters.feeStatus ||
        normalizeKey(student.fee_status) === normalizeKey(studentFilters.feeStatus);
      const haystack = [
        student.student_code,
        student.name,
        student.class,
        student.roll_no,
        student.parent_name,
        student.email,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query);

      return matchesClass && matchesFee && matchesQuery;
    });
  }, [studentFilters, students]);

  const visibleFeeStatusCounts = useMemo(() => {
    return filteredStudents.reduce(
      (summary, student) => {
        const status = normalizeKey(student.fee_status);

        if (status === "paid") {
          summary.paid += 1;
        } else if (status === "partial") {
          summary.partial += 1;
        } else {
          summary.unpaid += 1;
        }

        return summary;
      },
      { paid: 0, partial: 0, unpaid: 0 }
    );
  }, [filteredStudents]);

  const classSummaries = useMemo(() => {
    const summaryMap = new Map();

    students.forEach((student) => {
      const className = normalizeText(student.class) || "Unassigned";
      const current = summaryMap.get(className) || {
        class_name: className,
        total_students: 0,
        paid_students: 0,
        partial_students: 0,
        unpaid_students: 0,
        annual_fee: 0,
        paid_fee: 0,
        due_fee: 0,
      };

      current.total_students += 1;
      current.annual_fee += safeNumber(student.annual_fee);
      current.paid_fee += safeNumber(student.paid_fee);
      current.due_fee += safeNumber(student.due_fee);

      if (normalizeKey(student.fee_status) === "paid") {
        current.paid_students += 1;
      } else if (normalizeKey(student.fee_status) === "partial") {
        current.partial_students += 1;
      } else {
        current.unpaid_students += 1;
      }

      summaryMap.set(className, current);
    });

    return Array.from(summaryMap.values()).sort((left, right) =>
      compareClassNames(left.class_name, right.class_name)
    );
  }, [students]);

  const visibleClassSummaries = useMemo(() => {
    if (!classPaymentFilter) {
      return classSummaries;
    }

    return classSummaries.filter(
      (item) => normalizeText(item.class_name) === normalizeText(classPaymentFilter)
    );
  }, [classPaymentFilter, classSummaries]);

  const classPaymentStudents = useMemo(() => {
    if (!classPaymentFilter) {
      return [];
    }

    return students.filter(
      (student) => normalizeText(student.class) === normalizeText(classPaymentFilter)
    );
  }, [classPaymentFilter, students]);

  const attendanceSummary = useMemo(() => {
    return attendance.reduce(
      (summary, item) => {
        const status = normalizeKey(item.status);
        summary.total += 1;

        if (status === "present") {
          summary.present += 1;
        } else if (status === "absent") {
          summary.absent += 1;
        } else {
          summary.other += 1;
        }

        return summary;
      },
      { total: 0, present: 0, absent: 0, other: 0 }
    );
  }, [attendance]);

  const availableAttendanceDates = useMemo(() => {
    return Array.from(
      new Set(
        attendance
          .map((item) => formatDate(item.date))
          .filter((dateKey) => dateKey && dateKey !== "-")
      )
    ).sort((left, right) => right.localeCompare(left));
  }, [attendance]);

  const latestAttendanceDate = useMemo(() => {
    return availableAttendanceDates[0] || "";
  }, [availableAttendanceDates]);

  useEffect(() => {
    if (!availableAttendanceDates.length) {
      if (selectedAttendanceDate) {
        setSelectedAttendanceDate("");
      }
      return;
    }

    if (!selectedAttendanceDate || !availableAttendanceDates.includes(selectedAttendanceDate)) {
      setSelectedAttendanceDate(availableAttendanceDates[0]);
    }
  }, [availableAttendanceDates, selectedAttendanceDate]);

  useEffect(() => {
    if (!selectedAttendanceClass) {
      return;
    }

    const hasClass = students.some(
      (student) => normalizeText(student.class) === normalizeText(selectedAttendanceClass)
    );

    if (!hasClass) {
      setSelectedAttendanceClass("");
    }
  }, [selectedAttendanceClass, students]);

  const attendanceSnapshotDate = selectedAttendanceDate || latestAttendanceDate;
  const visibleAttendance = useMemo(() => {
    if (!attendanceSnapshotDate) {
      return attendance;
    }

    return attendance.filter((item) => formatDate(item.date) === attendanceSnapshotDate);
  }, [attendance, attendanceSnapshotDate]);

  const latestAttendanceByStudent = useMemo(() => {
    const summaryMap = new Map();

    attendance.forEach((item) => {
      if (formatDate(item.date) !== attendanceSnapshotDate) {
        return;
      }

      const studentKey = String(item.student_id || "");

      if (!studentKey) {
        return;
      }

      const current = summaryMap.get(studentKey);
      const currentId = Number(current?.id || 0);
      const nextId = Number(item.id || 0);

      if (!current || nextId >= currentId) {
        summaryMap.set(studentKey, item);
      }
    });

    return summaryMap;
  }, [attendance, attendanceSnapshotDate]);

  const schoolAttendanceSnapshot = useMemo(() => {
    return students.reduce(
      (summary, student) => {
        summary.total += 1;

        const record = latestAttendanceByStudent.get(String(student.id));
        const status = normalizeKey(record?.status);

        if (status === "present") {
          summary.present += 1;
        } else if (status === "absent") {
          summary.absent += 1;
        } else {
          summary.unmarked += 1;
        }

        return summary;
      },
      { total: 0, present: 0, absent: 0, unmarked: 0 }
    );
  }, [latestAttendanceByStudent, students]);

  const classAttendanceSnapshot = useMemo(() => {
    const summaryMap = new Map();

    students.forEach((student) => {
      const className = normalizeText(student.class) || "Unassigned";
      const current =
        summaryMap.get(className) || {
          class_name: className,
          total_students: 0,
          present_students: 0,
          absent_students: 0,
          unmarked_students: 0,
        };

      current.total_students += 1;

      const record = latestAttendanceByStudent.get(String(student.id));
      const status = normalizeKey(record?.status);

      if (status === "present") {
        current.present_students += 1;
      } else if (status === "absent") {
        current.absent_students += 1;
      } else {
        current.unmarked_students += 1;
      }

      summaryMap.set(className, current);
    });

    return Array.from(summaryMap.values())
      .map((item) => ({
        ...item,
        attendance_rate: item.total_students
          ? (item.present_students / item.total_students) * 100
          : 0,
      }))
      .sort((left, right) => compareClassNames(left.class_name, right.class_name));
  }, [latestAttendanceByStudent, students]);

  const selectedClassAttendanceStudents = useMemo(() => {
    if (!selectedAttendanceClass) {
      return [];
    }

    return students
      .filter((student) => normalizeText(student.class) === normalizeText(selectedAttendanceClass))
      .map((student) => {
        const record = latestAttendanceByStudent.get(String(student.id));
        const status = record?.status || "Not Marked";

        return {
          id: student.id,
          name: student.name,
          student_code: student.student_code,
          status,
          subject: record?.subject || "-",
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }, [latestAttendanceByStudent, selectedAttendanceClass, students]);

  const attendanceRate = attendanceSummary.total
    ? (attendanceSummary.present / attendanceSummary.total) * 100
    : 0;

  const currentSchoolAttendanceRate = schoolAttendanceSnapshot.total
    ? (schoolAttendanceSnapshot.present / schoolAttendanceSnapshot.total) * 100
    : 0;

  const attendanceTrend = useMemo(() => {
    const trendMap = new Map();

    attendance.forEach((item) => {
      const dateKey = formatDate(item.date);
      const current = trendMap.get(dateKey) || { date: dateKey, present: 0, total: 0 };

      current.total += 1;

      if (normalizeKey(item.status) === "present") {
        current.present += 1;
      }

      trendMap.set(dateKey, current);
    });

    return Array.from(trendMap.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-7)
      .map((item) => ({
        ...item,
        rate: item.total ? Number(((item.present / item.total) * 100).toFixed(1)) : 0,
      }));
  }, [attendance]);

  const subjectAverages = useMemo(() => {
    const subjectMap = new Map();

    marks.forEach((item) => {
      const subject = normalizeText(item.subject) || "Unknown";
      const current = subjectMap.get(subject) || { subject, total: 0, count: 0 };

      current.total += safeNumber(item.marks);
      current.count += 1;
      subjectMap.set(subject, current);
    });

    return Array.from(subjectMap.values())
      .map((item) => ({
        subject: item.subject,
        average: item.count ? Number((item.total / item.count).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.average - left.average);
  }, [marks]);

  const marksSummary = useMemo(() => {
    if (!marks.length) {
      return {
        average: 0,
        highest: null,
        topSubject: "-",
      };
    }

    const total = marks.reduce((sum, item) => sum + safeNumber(item.marks), 0);
    const highest = marks.reduce((best, current) =>
      safeNumber(current.marks) > safeNumber(best.marks) ? current : best
    );

    return {
      average: total / marks.length,
      highest,
      topSubject: subjectAverages[0]?.subject || "-",
    };
  }, [marks, subjectAverages]);

  const linkedParents = useMemo(
    () => parents.filter((item) => safeNumber(item.linked_students) > 0).length,
    [parents]
  );

  const parentCoverage = parents.length ? (linkedParents / parents.length) * 100 : 0;

  const totalAnnualFee = safeNumber(activeStats?.annual_fee);
  const totalPaidFee = safeNumber(activeStats?.paid_fee);
  const totalDueFee = safeNumber(activeStats?.due_fee);
  const collectionRate = totalAnnualFee > 0 ? (totalPaidFee / totalAnnualFee) * 100 : 0;

  const monthlyCollections = useMemo(() => {
    const today = new Date();

    return payments.reduce((sum, payment) => {
      const paidAt = payment?.paid_at ? new Date(payment.paid_at) : null;

      if (!paidAt || Number.isNaN(paidAt.getTime())) {
        return sum;
      }

      if (
        paidAt.getMonth() === today.getMonth() &&
        paidAt.getFullYear() === today.getFullYear()
      ) {
        return sum + safeNumber(payment.amount);
      }

      return sum;
    }, 0);
  }, [payments]);

  const overviewCards = [
    {
      eyebrow: "Enrollment",
      title: "Students on Roll",
      value: activeStats?.students ?? students.length,
      note: `${linkedParents} linked parent accounts support follow-up and portal readiness.`,
      tone: "primary",
    },
    {
      eyebrow: "Attendance",
      title: "Attendance Rate",
      value: formatPercent(attendanceRate),
      note: `${attendanceSummary.present} present vs ${attendanceSummary.absent} absent entries in the current ledger.`,
      tone: "neutral",
    },
    {
      eyebrow: "Academics",
      title: "Average Marks",
      value: marks.length ? marksSummary.average.toFixed(1) : "No data",
      note:
        marks.length > 0
          ? `Best performing subject right now: ${marksSummary.topSubject}.`
          : "Upload marks data to unlock subject-level analytics.",
      tone: "primary",
    },
    {
      eyebrow: "Finance",
      title: "Collection Progress",
      value: formatPercent(collectionRate),
      note: `${formatCurrency(totalDueFee)} remains pending across active student accounts.`,
      tone: "accent",
    },
    {
      eyebrow: "Admissions",
      title: "Open Applications",
      value: activeStats?.admissions ?? admissions.length,
      note: `${filteredAdmissions.length} visible forms in the current admissions queue.`,
      tone: "accent",
    },
    {
      eyebrow: "Operations",
      title: "Teachers Mapped",
      value: activeStats?.teachers ?? teachers.length,
      note: `${Math.max(safeNumber(activeStats?.classes), classOptions.length)} classes are ready for campus operations.`,
      tone: "neutral",
    },
  ];

  const enrollmentChartData = useMemo(() => {
    const visibleClasses = classSummaries.slice(0, 8);

    return {
      labels: visibleClasses.map((item) => `Class ${item.class_name}`),
      datasets: [
        {
          label: "Students",
          data: visibleClasses.map((item) => item.total_students),
          backgroundColor: "#0f766e",
          borderRadius: 10,
          maxBarThickness: 38,
        },
      ],
    };
  }, [classSummaries]);

  const collectionChartData = useMemo(
    () => ({
      labels: ["Collected", "Due"],
      datasets: [
        {
          data: [totalPaidFee, totalDueFee],
          backgroundColor: ["#0f766e", "#f59e0b"],
          borderWidth: 0,
        },
      ],
    }),
    [totalDueFee, totalPaidFee]
  );

  const attendanceTrendChartData = useMemo(
    () => ({
      labels: attendanceTrend.map((item) => item.date),
      datasets: [
        {
          label: "Attendance rate",
          data: attendanceTrend.map((item) => item.rate),
          borderColor: "#0f766e",
          backgroundColor: "rgba(15, 118, 110, 0.16)",
          fill: true,
        },
      ],
    }),
    [attendanceTrend]
  );

  const marksSubjectChartData = useMemo(() => {
    const topSubjects = subjectAverages.slice(0, 6);

    return {
      labels: topSubjects.map((item) => item.subject),
      datasets: [
        {
          label: "Average marks",
          data: topSubjects.map((item) => item.average),
          backgroundColor: "#0ea5e9",
          borderRadius: 10,
          maxBarThickness: 44,
        },
      ],
    };
  }, [subjectAverages]);

  const classFeeChartData = useMemo(() => {
    const visibleRows = visibleClassSummaries.slice(0, 6);

    return {
      labels: visibleRows.map((item) => `Class ${item.class_name}`),
      datasets: [
        {
          label: "Paid",
          data: visibleRows.map((item) => item.paid_fee),
          backgroundColor: "#0f766e",
          borderRadius: 8,
        },
        {
          label: "Due",
          data: visibleRows.map((item) => item.due_fee),
          backgroundColor: "#f59e0b",
          borderRadius: 8,
        },
      ],
    };
  }, [visibleClassSummaries]);

  const recentAdmissions = filteredAdmissions.slice(0, 5);
  const recentPayments = payments.slice(0, 6);
  const recentAttendance = visibleAttendance.slice(0, 8);
  const recentMarks = marks.slice(0, 8);
  const timetableByDay = useMemo(() => {
    const grouped = {};

    timetables.forEach((item) => {
      const key = item.day_of_week || "mon";

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(item);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((left, right) => String(left.start_time).localeCompare(String(right.start_time)));
    });

    return grouped;
  }, [timetables]);

  const applyBundleToFinance = (bundle) => {
    setPaymentLookupCode(bundle?.student?.student_code || "");
    setPaymentRecord(bundle);
    setPaymentForm({
      fee_status: bundle?.fee?.fee_status || bundle?.student?.fee_status || "unpaid",
      paid_fee: String(bundle?.fee?.paid_fee ?? bundle?.student?.paid_fee ?? ""),
    });
    setPaymentStatus({ type: "", message: "" });
  };

  const handleTeacherField = (field) => (event) => {
    setTeacherForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleStudentFilterField = (field) => (event) => {
    setStudentFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const resetTeacherForm = () => {
    setTeacherForm(createTeacherForm());
  };

  const handleSaveTeacher = async () => {
    if (!normalizeText(teacherForm.name) || !normalizeText(teacherForm.email)) {
      setTeacherStatus({ type: "error", message: "Teacher name and email are required." });
      return;
    }

    if (!teacherForm.id && !normalizeText(teacherForm.password)) {
      setTeacherStatus({ type: "error", message: "Password is required for a new teacher." });
      return;
    }

    setIsSavingTeacher(true);
    setTeacherStatus({ type: "", message: "" });

    try {
      const payload = {
        school_id: schoolId,
        schoolCode,
        name: normalizeText(teacherForm.name),
        email: normalizeText(teacherForm.email),
        assigned_class: teacherForm.assigned_class,
        assigned_subject: normalizeText(teacherForm.assigned_subject),
      };

      if (normalizeText(teacherForm.password)) {
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
      await Promise.all([loadTeachers(), loadWorkspaceStats()]);
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
    setActiveSection("operations");
  };

  const handleCreateClass = async () => {
    if (!normalizeText(classForm.class_name)) {
      setClassStatus({ type: "error", message: "Class name is required." });
      return;
    }

    setIsCreatingClass(true);
    setClassStatus({ type: "", message: "" });

    try {
      await api.post("/classes", {
        schoolCode,
        class_name: normalizeText(classForm.class_name),
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

  const handleOpenStudentProfile = async (studentCode) => {
    setSelectedStudentCode(studentCode);
    setSelectedStudentStatus({ type: "", message: "" });
    setIsLoadingStudentBundle(true);

    try {
      const bundle = await fetchStudentBundle(studentCode);
      setSelectedStudentBundle(bundle);
    } catch (requestError) {
      setSelectedStudentBundle(null);
      setSelectedStudentStatus({
        type: "error",
        message:
          requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load the student profile.",
      });
    } finally {
      setIsLoadingStudentBundle(false);
    }
  };

  const handlePaymentLookup = async () => {
    setPaymentStatus({ type: "", message: "" });

    try {
      const result = await fetchStudentBundle(paymentLookupCode);
      applyBundleToFinance(result);
    } catch (requestError) {
      setPaymentRecord(null);
      setPaymentStatus({
        type: "error",
        message:
          requestError.response?.data?.message ||
          requestError.message ||
          "Student payment details could not be loaded.",
      });
    }
  };

  const handlePaymentField = (field) => (event) => {
    setPaymentForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleNotificationField = (field) => (event) => {
    setNotificationForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleTimetableField = (field) => (event) => {
    setTimetableForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleRoleField = (field) => (event) => {
    setRoleForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const toggleRolePermission = (permissionName) => {
    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permissionName)
        ? current.permissions.filter((item) => item !== permissionName)
        : [...current.permissions, permissionName],
    }));
  };

  const handleUpdatePaymentStatus = async () => {
    if (!paymentRecord?.student?.id) {
      setPaymentStatus({ type: "error", message: "Search a student first." });
      return;
    }

    if (
      paymentForm.fee_status === "partial" &&
      (!paymentForm.paid_fee || safeNumber(paymentForm.paid_fee) <= 0)
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
        paid_fee: paymentForm.fee_status === "partial" ? safeNumber(paymentForm.paid_fee) : undefined,
      });

      const refreshedBundle = await fetchStudentBundle(
        paymentRecord.student.student_code || paymentLookupCode
      );

      applyBundleToFinance(refreshedBundle);

      if (
        selectedStudentCode &&
        normalizeText(selectedStudentCode) ===
          normalizeText(refreshedBundle.student?.student_code)
      ) {
        setSelectedStudentBundle(refreshedBundle);
      }

      setPaymentStatus({ type: "success", message: "Payment status updated successfully." });
      await Promise.all([loadStudents(), loadPayments(), loadWorkspaceStats()]);
    } catch (requestError) {
      setPaymentStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to update payment status.",
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleCreateNotification = async () => {
    if (!normalizeText(notificationForm.title) || !normalizeText(notificationForm.message)) {
      setNotificationStatus({ type: "error", message: "Title and message are required." });
      return;
    }

    if (notificationForm.audience === "class" && !normalizeText(notificationForm.class_name)) {
      setNotificationStatus({ type: "error", message: "Class is required for class announcements." });
      return;
    }

    setIsSavingNotification(true);
    setNotificationStatus({ type: "", message: "" });

    try {
      if (notificationForm.id) {
        await api.patch(`/notifications/${notificationForm.id}`, {
          schoolCode,
          title: notificationForm.title,
          message: notificationForm.message,
          audience: notificationForm.audience,
          class_name: notificationForm.audience === "class" ? notificationForm.class_name : "",
          updated_by: admin?.name || "School Admin",
        });
      } else {
        await api.post("/notifications", {
          schoolCode,
          title: notificationForm.title,
          message: notificationForm.message,
          audience: notificationForm.audience,
          class_name: notificationForm.audience === "class" ? notificationForm.class_name : "",
          created_by: admin?.name || "School Admin",
        });
      }

      setNotificationForm({
        id: null,
        title: "",
        message: "",
        audience: "all",
        class_name: "",
      });
      setNotificationStatus({
        type: "success",
        message: notificationForm.id ? "Notification updated successfully." : "Notification published successfully.",
      });
      await Promise.all([loadNotifications(), loadAuditLogs()]);
    } catch (requestError) {
      setNotificationStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to publish notification.",
      });
    } finally {
      setIsSavingNotification(false);
    }
  };

  const handleCreateTimetable = async () => {
    const requiredFields = [
      timetableForm.class_name,
      timetableForm.day_of_week,
      timetableForm.start_time,
      timetableForm.end_time,
      timetableForm.subject_name,
    ];

    if (requiredFields.some((value) => !normalizeText(value))) {
      setTimetableStatus({ type: "error", message: "Class, day, time, and subject are required." });
      return;
    }

    setIsSavingTimetable(true);
    setTimetableStatus({ type: "", message: "" });

    try {
      if (timetableForm.id) {
        await api.patch(`/timetables/${timetableForm.id}`, {
          schoolCode,
          ...timetableForm,
          updated_by: admin?.name || "School Admin",
        });
      } else {
        await api.post("/timetables", {
          schoolCode,
          ...timetableForm,
          created_by: admin?.name || "School Admin",
        });
      }

      setTimetableForm({
        id: null,
        class_name: "",
        day_of_week: "mon",
        start_time: "",
        end_time: "",
        subject_name: "",
        teacher_name: "",
        room_no: "",
      });
      setTimetableStatus({
        type: "success",
        message: timetableForm.id ? "Timetable slot updated successfully." : "Timetable slot added successfully.",
      });
      await Promise.all([loadTimetables(), loadAuditLogs()]);
    } catch (requestError) {
      setTimetableStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to save timetable entry.",
      });
    } finally {
      setIsSavingTimetable(false);
    }
  };

  const handleSaveRole = async () => {
    if (!normalizeText(roleForm.name)) {
      setRoleStatus({ type: "error", message: "Role name is required." });
      return;
    }

    setIsSavingRole(true);
    setRoleStatus({ type: "", message: "" });

    try {
      await api.post("/roles", {
        schoolCode,
        name: roleForm.name,
        description: roleForm.description,
        permissions: roleForm.permissions,
        created_by: admin?.name || "School Admin",
      });

      setRoleStatus({ type: "success", message: "Role saved successfully." });
      setRoleForm({
        id: null,
        name: "",
        description: "",
        permissions: ["manage_attendance", "manage_grades"],
      });
      await Promise.all([loadRoles(), loadAuditLogs()]);
    } catch (requestError) {
      setRoleStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to save role.",
      });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleEditTimetable = (item) => {
    setTimetableForm({
      id: item.id,
      class_name: item.class_name || "",
      day_of_week: item.day_of_week || "mon",
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      subject_name: item.subject_name || "",
      teacher_name: item.teacher_name || "",
      room_no: item.room_no || "",
    });
    setTimetableStatus({ type: "", message: "" });
    setActiveSection("timetable");
  };

  const handleDeleteTimetable = async (id) => {
    try {
      await api.delete(`/timetables/${id}`, {
        params: { deleted_by: admin?.name || "School Admin" },
      });
      if (timetableForm.id === id) {
        setTimetableForm({
          id: null,
          class_name: "",
          day_of_week: "mon",
          start_time: "",
          end_time: "",
          subject_name: "",
          teacher_name: "",
          room_no: "",
        });
      }
      setTimetableStatus({ type: "success", message: "Timetable slot deleted successfully." });
      await Promise.all([loadTimetables(), loadAuditLogs()]);
    } catch (requestError) {
      setTimetableStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to delete timetable slot.",
      });
    }
  };

  const handleEditNotification = (item) => {
    setNotificationForm({
      id: item.id,
      title: item.title || "",
      message: item.message || "",
      audience: item.audience || "all",
      class_name: item.class_name || "",
    });
    setNotificationStatus({ type: "", message: "" });
    setActiveSection("notifications");
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`, {
        params: { deleted_by: admin?.name || "School Admin" },
      });
      if (notificationForm.id === id) {
        setNotificationForm({
          id: null,
          title: "",
          message: "",
          audience: "all",
          class_name: "",
        });
      }
      setNotificationStatus({ type: "success", message: "Notification deleted successfully." });
      await Promise.all([loadNotifications(), loadAuditLogs()]);
    } catch (requestError) {
      setNotificationStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to delete notification.",
      });
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await api.delete(`/roles/${roleId}`, {
        params: { deleted_by: admin?.name || "School Admin" },
      });
      setRoleStatus({ type: "success", message: "Role deleted successfully." });
      await Promise.all([loadRoles(), loadAuditLogs()]);
    } catch (requestError) {
      setRoleStatus({
        type: "error",
        message: requestError.response?.data?.message || "Unable to delete role.",
      });
    }
  };

  const handleSendNotificationPreview = async (channel) => {
    setDeliveryStatus({ type: "", message: "" });

    try {
      const endpoint = channel === "email" ? "/send-email" : "/send-sms";
      const payload =
        channel === "email"
          ? {
              to: "school@example.com",
              subject: notificationForm.title || "School notice",
              body: notificationForm.message || "Notification preview",
            }
          : {
              to: "9999999999",
              message: notificationForm.message || "Notification preview",
            };

      const { data } = await api.post(endpoint, payload);
      setDeliveryStatus({
        type: "success",
        message: `${channel.toUpperCase()} ${data.mode || "simulated"}: ${data.message}`,
      });
    } catch (requestError) {
      setDeliveryStatus({
        type: "error",
        message: requestError.response?.data?.message || `Unable to send ${channel} preview.`,
      });
    }
  };

  const selectedStudent = selectedStudentBundle?.student || null;
  const visibleMessage = error || workspaceStatus.message;

  const overviewSection = (
    <div className="section-stack">
      <div className="hero-grid">
        <div className="hero-panel hero-panel--accent">
          <span className="card-eyebrow">Executive Snapshot</span>
          <h3>Professional school operations start with visibility across students, academics, and collections.</h3>
          <p className="muted-copy">
            This final workspace follows the PDF recommendations by bringing together student profiles, attendance, gradebook insight, fee monitoring, and governance priorities.
          </p>
          <div className="highlight-grid">
            <div className="highlight-card">
              <span className="highlight-value">{formatPercent(attendanceRate)}</span>
              <span className="highlight-label">attendance rate</span>
            </div>
            <div className="highlight-card">
              <span className="highlight-value">{formatPercent(collectionRate)}</span>
              <span className="highlight-label">fee collection progress</span>
            </div>
            <div className="highlight-card">
              <span className="highlight-value">{linkedParents}</span>
              <span className="highlight-label">linked parent accounts</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <span className="card-eyebrow">Today&apos;s Focus</span>
          <h3>What needs attention next</h3>
          <ul className="info-list">
            <li>
              <span>Admissions waiting in queue</span>
              <strong>{activeStats?.admissions ?? admissions.length}</strong>
            </li>
            <li>
              <span>Outstanding fee balance</span>
              <strong>{formatCurrency(totalDueFee)}</strong>
            </li>
            <li>
              <span>Parent coverage</span>
              <strong>{formatPercent(parentCoverage)}</strong>
            </li>
          </ul>

          <div className="action-grid compact-action-grid panel-top-gap">
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

      {isLoading || isSyncingWorkspace ? (
        <p className="empty-state">Dashboard summary load ho rahi hai...</p>
      ) : (
        <div className="stats-grid">
          {overviewCards.map((item) => (
            <MetricCard key={item.title} {...item} />
          ))}
        </div>
      )}

      <div className="insight-grid">
        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Class-Wise Enrollment</h3>
              <p className="section-caption">See which classes carry the strongest current roster load.</p>
            </div>
          </div>
          {classSummaries.length ? (
            <div className="dashboard-chart dashboard-chart-bar">
              <Bar data={enrollmentChartData} options={barChartOptions} />
            </div>
          ) : (
            <EmptyChart message="No class enrollment data is available yet." />
          )}
        </div>

        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Fee Position</h3>
              <p className="section-caption">Collections versus pending amount across the school.</p>
            </div>
          </div>
          {hasPositiveValues([totalPaidFee, totalDueFee]) ? (
            <div className="dashboard-chart dashboard-chart-pie">
              <Doughnut data={collectionChartData} options={doughnutChartOptions} />
            </div>
          ) : (
            <EmptyChart message="No fee collection data is available yet." />
          )}
        </div>
      </div>

      <div className="insight-grid">
        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Attendance Trend</h3>
              <p className="section-caption">Latest daily presence rate based on saved attendance entries.</p>
            </div>
          </div>
          {attendanceTrend.length ? (
            <div className="dashboard-chart dashboard-chart-bar">
              <Line data={attendanceTrendChartData} options={lineChartOptions} />
            </div>
          ) : (
            <EmptyChart message="Attendance entries will appear here once teachers start marking records." />
          )}
        </div>

        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Subject Performance</h3>
              <p className="section-caption">Average marks by subject for quick academic review.</p>
            </div>
          </div>
          {subjectAverages.length ? (
            <div className="dashboard-chart dashboard-chart-bar">
              <Bar data={marksSubjectChartData} options={barChartOptions} />
            </div>
          ) : (
            <EmptyChart message="Marks analytics will appear once score entries are available." />
          )}
        </div>
      </div>

      <div className="summary-grid">
        <div className="info-card">
          <span className="card-eyebrow">Recent Admissions</span>
          <h3>Latest parent intake activity</h3>
          <div className="activity-list">
            {recentAdmissions.length ? (
              recentAdmissions.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <strong>{item.student_name}</strong>
                    <span>
                      Class {item.class_name} • {item.parent_name || "Parent"}
                    </span>
                  </div>
                  <div className="activity-item-meta">
                    <StatusPill value={item.status} />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No admission forms have been submitted yet.</p>
            )}
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Recent Payments</span>
          <h3>Latest collection activity</h3>
          <div className="activity-list">
            {recentPayments.length ? (
              recentPayments.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <strong>{item.student_name}</strong>
                    <span>
                      {item.payment_method} • {item.transaction_ref}
                    </span>
                  </div>
                  <div className="activity-item-meta">
                    <strong>{formatCurrency(item.amount)}</strong>
                    <span>{formatDate(item.paid_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No payment records are available yet.</p>
            )}
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Build Priorities</span>
          <h3>High-impact recommendations already reflected here</h3>
          <div className="feature-list">
            {featurePriorities.map((item) => (
              <div key={item.title} className="feature-item">
                <strong>{item.title}</strong>
                <div className="badge-row">
                  <span className={`status-pill status-pill--${getStatusTone(item.priority)}`}>
                    {item.priority} priority
                  </span>
                  <span className="status-pill status-pill--neutral">
                    {item.complexity} complexity
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const studentsSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Student Profiles</h3>
          <p className="section-caption">
            This section follows the recommended master-detail pattern with filters on the left and a richer profile on selection.
          </p>
        </div>
      </div>

      <div className="info-card">
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="student-filter-class">Class</label>
            <select
              id="student-filter-class"
              value={studentFilters.className}
              onChange={handleStudentFilterField("className")}
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
            <label htmlFor="student-filter-fee">Fee Status</label>
            <select
              id="student-filter-fee"
              value={studentFilters.feeStatus}
              onChange={handleStudentFilterField("feeStatus")}
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="student-filter-query">Search</label>
            <input
              id="student-filter-query"
              value={studentFilters.query}
              onChange={handleStudentFilterField("query")}
              placeholder="Name, code, parent, email, or roll number"
            />
          </div>
        </div>

        {selectedStudentStatus.message ? (
          <p className={`status-message ${selectedStudentStatus.type}`}>
            {selectedStudentStatus.message}
          </p>
        ) : null}
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Visible Students"
          title="Filtered Roster"
          value={filteredStudents.length}
          note="Students matching the current class, fee, and keyword filters."
          tone="primary"
        />
        <MetricCard
          eyebrow="Fee Paid"
          title="Paid Students"
          value={visibleFeeStatusCounts.paid}
          note="Students with cleared annual fee status in this filtered view."
          tone="neutral"
        />
        <MetricCard
          eyebrow="Partial"
          title="Partial Payments"
          value={visibleFeeStatusCounts.partial}
          note="Students that still need a follow-up payment touchpoint."
          tone="accent"
        />
        <MetricCard
          eyebrow="Pending"
          title="Unpaid Students"
          value={visibleFeeStatusCounts.unpaid}
          note="Students whose records still show pending or unpaid fee status."
          tone="accent"
        />
      </div>

      <div className="profile-layout">
        <div className="info-card table-panel">
          <div className="table-panel-header">
            <h3>Student Directory</h3>
            <p className="section-caption">
              Select a student to load profile, guardian, fee, and installment details.
            </p>
          </div>

          {filteredStudents.length ? (
            <div className="table-wrapper">
              <table className="data-table wide-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Parent</th>
                    <th>Fee Status</th>
                    <th>Due Fee</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.student_code}</td>
                      <td>{student.name}</td>
                      <td>
                        {student.class} {student.section}
                      </td>
                      <td>{student.parent_name || "-"}</td>
                      <td>
                        <StatusPill value={student.fee_status} />
                      </td>
                      <td>{formatCurrency(student.due_fee)}</td>
                      <td className="actions-cell">
                        <button
                          className="secondary-button"
                          onClick={() => handleOpenStudentProfile(student.student_code)}
                        >
                          {selectedStudentCode === student.student_code && isLoadingStudentBundle
                            ? "Loading..."
                            : "Open Profile"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">No students match the current filter set.</p>
            </div>
          )}
        </div>

        <div className="profile-panel">
          {selectedStudent ? (
            <div className="section-stack">
              <div className="info-card">
                <span className="card-eyebrow">Selected Profile</span>
                <h3>{selectedStudent.name}</h3>
                <p className="muted-copy">
                  Student code {selectedStudent.student_code} • Class {selectedStudent.class} {selectedStudent.section}
                </p>
                <div className="badge-row">
                  <StatusPill value={selectedStudent.fee_status} />
                  <span className="status-pill status-pill--neutral">Roll {selectedStudent.roll_no}</span>
                  <span className="status-pill status-pill--neutral">{selectedStudent.email}</span>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={() => {
                      applyBundleToFinance(selectedStudentBundle);
                      setActiveSection("finance");
                    }}
                  >
                    Open In Finance
                  </button>
                </div>
              </div>

              <div className="profile-section-grid">
                <div className="info-card">
                  <span className="card-eyebrow">Personal</span>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span>School</span>
                      <strong>{selectedStudent.school_name || "-"}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Class</span>
                      <strong>
                        {selectedStudent.class} {selectedStudent.section}
                      </strong>
                    </div>
                    <div className="detail-item">
                      <span>Roll Number</span>
                      <strong>{selectedStudent.roll_no}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Email</span>
                      <strong>{selectedStudent.email || "-"}</strong>
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <span className="card-eyebrow">Guardian</span>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span>Parent Name</span>
                      <strong>{selectedStudent.parent_name || "-"}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Parent Email</span>
                      <strong>{selectedStudent.parent_email || "-"}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Parent Phone</span>
                      <strong>{selectedStudent.parent_phone || "-"}</strong>
                    </div>
                    <div className="detail-item">
                      <span>School Code</span>
                      <strong>{selectedStudent.school_code || schoolCode}</strong>
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <span className="card-eyebrow">Fee Position</span>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span>Annual Fee</span>
                      <strong>{formatCurrency(selectedStudentBundle?.fee?.annual_fee)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Paid Fee</span>
                      <strong>{formatCurrency(selectedStudentBundle?.fee?.paid_fee)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Due Fee</span>
                      <strong>{formatCurrency(selectedStudentBundle?.fee?.due_fee)}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Installments</span>
                      <strong>{selectedStudentBundle?.installments?.length || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <span className="card-eyebrow">Recent Payments</span>
                  <div className="activity-list">
                    {selectedStudentBundle?.payments?.length ? (
                      selectedStudentBundle.payments.slice(0, 4).map((payment) => (
                        <div key={payment.id} className="activity-item">
                          <div>
                            <strong>{formatCurrency(payment.amount)}</strong>
                            <span>
                              {payment.payment_method || "manual"} • {payment.transaction_ref}
                            </span>
                          </div>
                          <div className="activity-item-meta">
                            <StatusPill value={payment.status} />
                            <span>{formatDate(payment.paid_at)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">No payment history is available for this student yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="profile-placeholder">
              <h3>No profile selected yet</h3>
              <p>Pick a student from the directory to load the detailed profile and finance panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const attendanceSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Attendance Control</h3>
          <p className="section-caption">
            Daily presence should be easy to read at a glance and easy to escalate when trends slip.
          </p>
        </div>
        <div className="attendance-filter-bar">
          <div className="attendance-view-toggle" role="tablist" aria-label="Attendance view mode">
            <button
              type="button"
              className={`secondary-button ${
                attendanceViewMode === "school" ? "attendance-toggle-button--active" : ""
              }`}
              onClick={() => {
                setAttendanceViewMode("school");
                setSelectedAttendanceClass("");
              }}
            >
              Total School Attendance
            </button>
            <button
              type="button"
              className={`secondary-button ${
                attendanceViewMode === "class" ? "attendance-toggle-button--active" : ""
              }`}
              onClick={() => setAttendanceViewMode("class")}
            >
              Class-wise Attendance
            </button>
          </div>
          <div className="field-group attendance-filter-field">
            <label htmlFor="attendance-date-filter">Attendance Date</label>
            <input
              id="attendance-date-filter"
              type="date"
              value={selectedAttendanceDate}
              onChange={(event) => setSelectedAttendanceDate(event.target.value)}
              min={availableAttendanceDates[availableAttendanceDates.length - 1] || undefined}
              max={availableAttendanceDates[0] || undefined}
              list="attendance-date-options"
            />
            <datalist id="attendance-date-options">
              {availableAttendanceDates.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {attendanceViewMode === "school" ? (
        <div className="card-grid">
          <MetricCard
            eyebrow="School"
            title="Total Students"
            value={schoolAttendanceSnapshot.total}
            note="Current school roster size used for today's attendance snapshot."
            tone="primary"
          />
          <MetricCard
            eyebrow="Present"
            title="Present Students"
            value={schoolAttendanceSnapshot.present}
            note={`Students marked present on ${attendanceSnapshotDate || "the selected date"}.`}
            tone="neutral"
          />
          <MetricCard
            eyebrow="Absent"
            title="Absent / Not Marked"
            value={schoolAttendanceSnapshot.absent + schoolAttendanceSnapshot.unmarked}
            note={`${schoolAttendanceSnapshot.absent} absent and ${schoolAttendanceSnapshot.unmarked} not marked on ${attendanceSnapshotDate || "the selected date"}.`}
            tone="accent"
          />
          <MetricCard
            eyebrow="Rate"
            title="Current Presence Rate"
            value={formatPercent(currentSchoolAttendanceRate)}
            note="Presence percentage based on the full student roster, not raw attendance rows."
            tone="primary"
          />
        </div>
      ) : null}

      <div className="insight-grid">
        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Daily Attendance Pattern</h3>
              <p className="section-caption">Latest seven attendance dates mapped into an easy trend line.</p>
            </div>
          </div>
          {attendanceTrend.length ? (
            <div className="dashboard-chart dashboard-chart-bar">
              <Line data={attendanceTrendChartData} options={lineChartOptions} />
            </div>
          ) : (
            <EmptyChart message="No attendance trend can be generated until records are marked." />
          )}
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Recent Attendance Activity</span>
          <h3>Latest saved records</h3>
          <p className="section-caption">
            Snapshot date: {attendanceSnapshotDate || "No attendance marked yet"}.
          </p>
          <div className="activity-list">
            {recentAttendance.length ? (
              recentAttendance.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <strong>{item.student_name}</strong>
                    <span>
                      {item.subject || "General"} • {formatDate(item.date)}
                    </span>
                  </div>
                  <div className="activity-item-meta">
                    <StatusPill value={item.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No attendance activity is available yet.</p>
            )}
          </div>
        </div>
      </div>

      {attendanceViewMode === "class" ? (
        <div className="info-card table-panel">
          <div className="table-panel-header">
            <h3>Class-wise Attendance Snapshot</h3>
            <p className="section-caption">
              Total students vs present, absent, and unmarked counts for {attendanceSnapshotDate || "the selected attendance date"}.
            </p>
          </div>

          {classAttendanceSnapshot.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Total Students</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Not Marked</th>
                    <th>Presence Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {classAttendanceSnapshot.map((item) => (
                    <tr key={item.class_name}>
                      <td>
                        <button
                          type="button"
                          className={`class-link-button ${
                            normalizeText(selectedAttendanceClass) === normalizeText(item.class_name)
                              ? "class-link-button--active"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedAttendanceClass((currentValue) =>
                              normalizeText(currentValue) === normalizeText(item.class_name)
                                ? ""
                                : item.class_name
                            )
                          }
                        >
                          {item.class_name}
                        </button>
                      </td>
                      <td>{item.total_students}</td>
                      <td>{item.present_students}</td>
                      <td>{item.absent_students}</td>
                      <td>{item.unmarked_students}</td>
                      <td>{formatPercent(item.attendance_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">Class-wise attendance snapshot abhi available nahi hai.</p>
            </div>
          )}
        </div>
      ) : null}

      {attendanceViewMode === "class" && selectedAttendanceClass ? (
        <div className="info-card table-panel">
          <div className="table-panel-header attendance-detail-header">
            <div>
              <h3>{selectedAttendanceClass} Attendance Detail</h3>
              <p className="section-caption">
                Student-wise status for {attendanceSnapshotDate || "the selected date"}.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedAttendanceClass("")}
            >
              Clear Class
            </button>
          </div>

          {selectedClassAttendanceStudents.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student Code</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedClassAttendanceStudents.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.student_code || "-"}</td>
                      <td>{item.subject}</td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">Is class ke liye attendance detail abhi available nahi hai.</p>
            </div>
          )}
        </div>
      ) : null}

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Attendance Ledger</h3>
          <p className="section-caption">
            Records for {attendanceSnapshotDate || "the selected date"} across subjects and students.
          </p>
        </div>

        {visibleAttendance.length ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleAttendance.map((item) => (
                  <tr key={item.id}>
                    <td>{item.student_name}</td>
                    <td>{item.subject}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>
                      <StatusPill value={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-panel-header">
            <p className="empty-state">Selected date ke liye attendance records available nahi hain.</p>
          </div>
        )}
      </div>
    </div>
  );

  const academicsSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Gradebook Insight</h3>
          <p className="section-caption">
            A cleaner academic review surface for subject averages, highest scores, and recent score entries.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Entries"
          title="Marks Records"
          value={marks.length}
          note="Saved marks entries currently available in the school gradebook."
          tone="primary"
        />
        <MetricCard
          eyebrow="Average"
          title="Average Marks"
          value={marks.length ? marksSummary.average.toFixed(1) : "0.0"}
          note="Mean score across all current marks entries."
          tone="neutral"
        />
        <MetricCard
          eyebrow="Best Subject"
          title="Top Subject"
          value={marksSummary.topSubject}
          note="Best average-performing subject based on uploaded marks."
          tone="primary"
        />
        <MetricCard
          eyebrow="Highest Score"
          title="Top Entry"
          value={marksSummary.highest ? safeNumber(marksSummary.highest.marks) : 0}
          note={
            marksSummary.highest
              ? `${marksSummary.highest.student_name} in ${marksSummary.highest.subject}`
              : "Highest mark will appear once records are available."
          }
          tone="accent"
        />
      </div>

      <div className="insight-grid">
        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Subject Average Distribution</h3>
              <p className="section-caption">Top six subjects ordered by current average marks.</p>
            </div>
          </div>
          {subjectAverages.length ? (
            <div className="dashboard-chart dashboard-chart-bar">
              <Bar data={marksSubjectChartData} options={barChartOptions} />
            </div>
          ) : (
            <EmptyChart message="No marks data is available for academic analytics yet." />
          )}
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Recent Marks Activity</span>
          <h3>Latest score updates</h3>
          <div className="activity-list">
            {recentMarks.length ? (
              recentMarks.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <strong>{item.student_name}</strong>
                    <span>
                      {item.subject} • Year {item.year}
                    </span>
                  </div>
                  <div className="activity-item-meta">
                    <strong>{item.marks}</strong>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">Marks entries will appear here once uploaded.</p>
            )}
          </div>
        </div>
      </div>

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Gradebook Ledger</h3>
          <p className="section-caption">Browse the full marks table with subject and year context.</p>
        </div>

        {marks.length ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((item) => (
                  <tr key={item.id}>
                    <td>{item.student_name}</td>
                    <td>{item.subject}</td>
                    <td>{item.marks}</td>
                    <td>{item.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-panel-header">
            <p className="empty-state">No marks records available yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const financeSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Finance Workspace</h3>
          <p className="section-caption">
            Keep fee status, class-wise collections, and student-level follow-up in one place.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Annual Fee"
          title="Total Expected"
          value={formatCurrency(totalAnnualFee)}
          note="Total annual fee mapped across student accounts in this school."
          tone="primary"
        />
        <MetricCard
          eyebrow="Collected"
          title="Collected Fee"
          value={formatCurrency(totalPaidFee)}
          note="Paid amount currently reflected in student and fee snapshot data."
          tone="neutral"
        />
        <MetricCard
          eyebrow="Due"
          title="Pending Fee"
          value={formatCurrency(totalDueFee)}
          note="Outstanding amount still waiting for collection follow-up."
          tone="accent"
        />
        <MetricCard
          eyebrow="This Month"
          title="Monthly Collections"
          value={formatCurrency(monthlyCollections)}
          note="Amount collected during the current calendar month."
          tone="primary"
        />
      </div>

      <div className="insight-grid">
        <div className="info-card chart-card">
          <div className="section-heading">
            <div>
              <h3>Class-Wise Collection Position</h3>
              <p className="section-caption">Compare paid and due fee by class from the current roster.</p>
            </div>
          </div>

          <div className="field-group finance-filter">
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

          {visibleClassSummaries.length ? (
            <div className="dashboard-chart dashboard-chart-bar">
              <Bar data={classFeeChartData} options={stackedBarOptions} />
            </div>
          ) : (
            <EmptyChart message="No student fee data is available for class-wise reporting yet." />
          )}
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Student Fee Lookup</span>
          <h3>Update payment status by student code</h3>
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

          {paymentRecord?.student ? (
            <div className="section-stack panel-top-gap">
              <div className="detail-list">
                <div className="detail-item">
                  <span>Student</span>
                  <strong>{paymentRecord.student.name}</strong>
                </div>
                <div className="detail-item">
                  <span>Current Fee Status</span>
                  <strong className="capitalize">{paymentRecord.student.fee_status}</strong>
                </div>
                <div className="detail-item">
                  <span>Paid / Due</span>
                  <strong>
                    {formatCurrency(paymentRecord.fee?.paid_fee)} / {formatCurrency(paymentRecord.fee?.due_fee)}
                  </strong>
                </div>
              </div>

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
                  {isUpdatingPayment ? "Updating..." : "Update Payment Status"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleOpenStudentProfile(paymentRecord.student.student_code)}
                >
                  Open Profile
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Class Summary</h3>
          <p className="section-caption">High-level class collection summary for fee review meetings.</p>
        </div>

        {visibleClassSummaries.length ? (
          <div className="table-wrapper">
            <table className="data-table wide-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Total Students</th>
                  <th>Paid</th>
                  <th>Partial</th>
                  <th>Unpaid</th>
                  <th>Collected</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {visibleClassSummaries.map((item) => (
                  <tr key={item.class_name}>
                    <td>Class {item.class_name}</td>
                    <td>{item.total_students}</td>
                    <td>{item.paid_students}</td>
                    <td>{item.partial_students}</td>
                    <td>{item.unpaid_students}</td>
                    <td>{formatCurrency(item.paid_fee)}</td>
                    <td>{formatCurrency(item.due_fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-panel-header">
            <p className="empty-state">No class fee summary is available yet.</p>
          </div>
        )}
      </div>

      {classPaymentFilter ? (
        <div className="info-card table-panel">
          <div className="table-panel-header">
            <h3>Students In Class {classPaymentFilter}</h3>
            <p className="section-caption">Useful for fee follow-up inside a specific class.</p>
          </div>

          {classPaymentStudents.length ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Student Code</th>
                    <th>Fee Status</th>
                    <th>Paid Fee</th>
                    <th>Due Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {classPaymentStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.student_code}</td>
                      <td>
                        <StatusPill value={student.fee_status} />
                      </td>
                      <td>{formatCurrency(student.paid_fee)}</td>
                      <td>{formatCurrency(student.due_fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-panel-header">
              <p className="empty-state">No students found for this class filter.</p>
            </div>
          )}
        </div>
      ) : null}

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Payment Ledger</h3>
          <p className="section-caption">Recent school payment entries with method and reference detail.</p>
        </div>

        {payments.length ? (
          <div className="table-wrapper">
            <table className="data-table wide-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((item) => (
                  <tr key={item.id}>
                    <td>{item.student_name}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{item.payment_method}</td>
                    <td>{item.transaction_ref}</td>
                    <td>
                      <StatusPill value={item.status} />
                    </td>
                    <td>{formatDate(item.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-panel-header">
            <p className="empty-state">No payment records available yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const admissionsSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Admissions Queue</h3>
          <p className="section-caption">
            Review school-specific admission forms and narrow the queue by class or status.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Forms"
          title="Total Forms"
          value={filteredAdmissions.length}
          note="Admission requests currently visible in the active filter view."
          tone="primary"
        />
        <MetricCard
          eyebrow="Submitted"
          title="Submitted Forms"
          value={
            filteredAdmissions.filter((item) => normalizeKey(item.status) === "submitted").length
          }
          note="Forms still waiting for the next admin action."
          tone="accent"
        />
        <MetricCard
          eyebrow="Parents"
          title="Parent Accounts"
          value={parents.length}
          note="Parent accounts already present inside this school context."
          tone="neutral"
        />
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
      </div>

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Admission Queue</h3>
          <p className="section-caption">Every row stays isolated to the current school code.</p>
        </div>

        {filteredAdmissions.length ? (
          <div className="table-wrapper">
            <table className="data-table wide-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Parent</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Submitted On</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissions.map((admission) => (
                  <tr key={admission.id}>
                    <td>{admission.student_name}</td>
                    <td>{admission.class_name}</td>
                    <td>{admission.parent_name || "-"}</td>
                    <td>{admission.parent_email || "-"}</td>
                    <td>{admission.parent_phone || "-"}</td>
                    <td>
                      <StatusPill value={admission.status} />
                    </td>
                    <td>{admission.reference_number}</td>
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
  );

  const timetableSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Timetable Planner</h3>
          <p className="section-caption">
            Build class schedules with day, time, subject, teacher, and room details from the admin workspace.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Schedule Slots"
          title="Total Timetable Entries"
          value={timetables.length}
          note="All timetable slots currently saved for this school."
          tone="primary"
        />
        <MetricCard
          eyebrow="Coverage"
          title="Classes Scheduled"
          value={new Set(timetables.map((item) => item.class_name).filter(Boolean)).size}
          note="Distinct classes that already have timetable entries."
          tone="neutral"
        />
      </div>

      <div className="insight-grid">
        <div className="info-card">
          <span className="card-eyebrow">Add Timetable Slot</span>
          <h3>Create a new schedule entry</h3>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="tt-class">Class</label>
              <select id="tt-class" value={timetableForm.class_name} onChange={handleTimetableField("class_name")}>
                <option value="">Select Class</option>
                {classOptions.map((className) => (
                  <option key={className} value={className}>
                    Class {className}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="tt-day">Day</label>
              <select id="tt-day" value={timetableForm.day_of_week} onChange={handleTimetableField("day_of_week")}>
                <option value="mon">Monday</option>
                <option value="tue">Tuesday</option>
                <option value="wed">Wednesday</option>
                <option value="thu">Thursday</option>
                <option value="fri">Friday</option>
                <option value="sat">Saturday</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="tt-start">Start Time</label>
              <input id="tt-start" type="time" value={timetableForm.start_time} onChange={handleTimetableField("start_time")} />
            </div>
            <div className="field-group">
              <label htmlFor="tt-end">End Time</label>
              <input id="tt-end" type="time" value={timetableForm.end_time} onChange={handleTimetableField("end_time")} />
            </div>
            <div className="field-group">
              <label htmlFor="tt-subject">Subject</label>
              <input id="tt-subject" value={timetableForm.subject_name} onChange={handleTimetableField("subject_name")} />
            </div>
            <div className="field-group">
              <label htmlFor="tt-teacher">Teacher</label>
              <input id="tt-teacher" value={timetableForm.teacher_name} onChange={handleTimetableField("teacher_name")} />
            </div>
            <div className="field-group">
              <label htmlFor="tt-room">Room</label>
              <input id="tt-room" value={timetableForm.room_no} onChange={handleTimetableField("room_no")} />
            </div>
          </div>

          {timetableStatus.message ? (
            <p className={`status-message ${timetableStatus.type}`}>{timetableStatus.message}</p>
          ) : null}

          <div className="button-row">
            <button className="primary-button" onClick={handleCreateTimetable} disabled={isSavingTimetable}>
              {isSavingTimetable ? "Saving..." : "Save Timetable Slot"}
            </button>
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Weekly View</span>
          <h3>Grouped by weekday</h3>
          <div className="timeline-list">
            {["mon", "tue", "wed", "thu", "fri", "sat"].map((dayKey) => (
              <div key={dayKey} className="timeline-item">
                <strong>{dayKey.toUpperCase()}</strong>
                {timetableByDay[dayKey]?.length ? (
                  timetableByDay[dayKey].slice(0, 4).map((item) => (
                    <p key={item.id} className="muted-copy">
                      {item.start_time}-{item.end_time} • Class {item.class_name} • {item.subject_name}
                    </p>
                  ))
                ) : (
                  <p className="muted-copy">No slots saved.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Timetable Ledger</h3>
          <p className="section-caption">Full schedule record with class, teacher, and room context.</p>
        </div>
        {timetables.length ? (
          <div className="table-wrapper">
            <table className="data-table wide-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Room</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {timetables.map((item) => (
                  <tr key={item.id}>
                    <td>Class {item.class_name}</td>
                    <td>{String(item.day_of_week).toUpperCase()}</td>
                    <td>{item.start_time} - {item.end_time}</td>
                    <td>{item.subject_name}</td>
                    <td>{item.teacher_name || "-"}</td>
                    <td>{item.room_no || "-"}</td>
                    <td className="actions-cell">
                      <div className="table-actions">
                        <button className="secondary-button" onClick={() => handleEditTimetable(item)}>
                          Edit
                        </button>
                        <button className="secondary-button" onClick={() => handleDeleteTimetable(item.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-panel-header">
            <p className="empty-state">No timetable entries available yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const notificationsSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Notifications And Messaging</h3>
          <p className="section-caption">
            Publish school-wide, parent, teacher, or class-specific notices and keep a clean communication log.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Announcements"
          title="Total Notices"
          value={notifications.length}
          note="All notices currently saved for this school."
          tone="primary"
        />
        <MetricCard
          eyebrow="Audience"
          title="Class Notices"
          value={notifications.filter((item) => item.audience === "class").length}
          note="Notices specifically targeted at a class audience."
          tone="accent"
        />
      </div>

      <div className="insight-grid">
        <div className="info-card">
          <span className="card-eyebrow">Create Notice</span>
          <h3>Send a new announcement</h3>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="nf-title">Title</label>
              <input id="nf-title" value={notificationForm.title} onChange={handleNotificationField("title")} />
            </div>
            <div className="field-group">
              <label htmlFor="nf-audience">Audience</label>
              <select id="nf-audience" value={notificationForm.audience} onChange={handleNotificationField("audience")}>
                <option value="all">All</option>
                <option value="parents">Parents</option>
                <option value="teachers">Teachers</option>
                <option value="class">Class</option>
              </select>
            </div>
            {notificationForm.audience === "class" ? (
              <div className="field-group">
                <label htmlFor="nf-class">Class</label>
                <select id="nf-class" value={notificationForm.class_name} onChange={handleNotificationField("class_name")}>
                  <option value="">Select Class</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>
                      Class {className}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="field-group span-all">
              <label htmlFor="nf-message">Message</label>
              <textarea id="nf-message" value={notificationForm.message} onChange={handleNotificationField("message")} />
            </div>
          </div>

          {notificationStatus.message ? (
            <p className={`status-message ${notificationStatus.type}`}>{notificationStatus.message}</p>
          ) : null}

          {deliveryStatus.message ? (
            <p className={`status-message ${deliveryStatus.type}`}>{deliveryStatus.message}</p>
          ) : null}

          <div className="button-row">
            <button className="primary-button" onClick={handleCreateNotification} disabled={isSavingNotification}>
              {isSavingNotification ? "Publishing..." : notificationForm.id ? "Update Notice" : "Publish Notice"}
            </button>
            <button className="secondary-button" onClick={() => handleSendNotificationPreview("email")}>
              Email Preview
            </button>
            <button className="secondary-button" onClick={() => handleSendNotificationPreview("sms")}>
              SMS Preview
            </button>
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Recent Notices</span>
          <h3>Communication log</h3>
          <div className="activity-list">
            {notifications.length ? (
              notifications.slice(0, 6).map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.audience}
                      {item.class_name ? ` • Class ${item.class_name}` : ""}
                    </span>
                    <span>{item.message}</span>
                  </div>
                  <div className="activity-item-meta">
                    <span>{item.created_by || "Admin"}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <div className="table-actions">
                    <button className="secondary-button" onClick={() => handleEditNotification(item)}>
                      Edit
                    </button>
                    <button className="secondary-button" onClick={() => handleDeleteNotification(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No notifications have been published yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const operationsSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Staff And Class Operations</h3>
          <p className="section-caption">
            Teacher and class workflows are merged here to reduce duplicate screens and simplify day-to-day setup.
          </p>
        </div>
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Teachers"
          title="Teacher Accounts"
          value={teachers.length}
          note="Staff records ready for attendance, marks, and class assignment."
          tone="primary"
        />
        <MetricCard
          eyebrow="Classes"
          title="Class Catalog"
          value={classOptions.length}
          note="Class choices currently available across admissions and teacher assignment."
          tone="neutral"
        />
        <MetricCard
          eyebrow="Parents"
          title="Linked Parents"
          value={linkedParents}
          note="Parents already connected to at least one student profile."
          tone="primary"
        />
        <MetricCard
          eyebrow="Readiness"
          title="Operations Coverage"
          value={formatPercent(parentCoverage)}
          note="Current parent linkage coverage inside school operations."
          tone="accent"
        />
      </div>

      <div className="insight-grid">
        <div className="info-card">
          <span className="card-eyebrow">Teacher Management</span>
          <h3>Add or update teacher records</h3>
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

        <div className="info-card">
          <span className="card-eyebrow">Class Management</span>
          <h3>Create the academic class catalog</h3>
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

          <div className="feature-list panel-top-gap">
            {classOptions.length ? (
              classOptions.map((className) => (
                <div key={className} className="feature-item">
                  <strong>Class {className}</strong>
                  <span className="muted-copy">
                    Ready for student assignment, teacher mapping, and admission forms.
                  </span>
                </div>
              ))
            ) : (
              <p className="empty-state">No classes created yet. Start with one class or bootstrap 1 to 12.</p>
            )}
          </div>
        </div>
      </div>

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Teacher Records</h3>
          <p className="section-caption">
            Edit a teacher row to update login details, class assignment, or subject ownership.
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
  );

  const governanceSection = (
    <div className="section-stack">
      <div className="section-heading">
        <div>
          <h3>Governance And Rollout</h3>
          <p className="section-caption">
            This section turns the PDF recommendations into an actionable school-admin implementation lens.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="info-card">
          <span className="card-eyebrow">Role-Based Access</span>
          <h3>Who should do what</h3>
          <div className="feature-list">
            {(roles.length
              ? roles.map((item) => ({
                  role: item.name,
                  access: item.permission_labels?.length
                    ? item.permission_labels.join(", ")
                    : item.description || "No permissions assigned yet.",
                }))
              : roleAccessMatrix
            ).map((item) => (
              <div key={item.role} className="feature-item">
                <strong>{item.role}</strong>
                <span className="muted-copy">{item.access}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Implementation Timeline</span>
          <h3>Recommended delivery sequence</h3>
          <div className="timeline-list">
            {roadmapItems.map((item) => (
              <div key={item.phase} className="timeline-item">
                <strong>{item.phase}</strong>
                <span>{item.window}</span>
                <p className="muted-copy">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">UX Standards</span>
          <h3>Non-negotiables for the final product</h3>
          <div className="feature-list">
            {uxStandards.map((item) => (
              <div key={item} className="feature-item">
                <strong>Guideline</strong>
                <span className="muted-copy">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="insight-grid">
        <div className="info-card">
          <span className="card-eyebrow">Create Custom Role</span>
          <h3>School-level RBAC setup</h3>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="role-name">Role Name</label>
              <input id="role-name" value={roleForm.name} onChange={handleRoleField("name")} />
            </div>
            <div className="field-group">
              <label htmlFor="role-description">Description</label>
              <input id="role-description" value={roleForm.description} onChange={handleRoleField("description")} />
            </div>
            <div className="field-group span-all">
              <label>Permissions</label>
              <div className="permission-grid">
                {availablePermissions.map((permissionName) => (
                  <label key={permissionName} className="permission-chip">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions.includes(permissionName)}
                      onChange={() => toggleRolePermission(permissionName)}
                    />
                    <span>{permissionName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {roleStatus.message ? (
            <p className={`status-message ${roleStatus.type}`}>{roleStatus.message}</p>
          ) : null}

          <div className="button-row">
            <button className="primary-button" onClick={handleSaveRole} disabled={isSavingRole}>
              {isSavingRole ? "Saving..." : "Save Role"}
            </button>
          </div>
        </div>

        <div className="info-card">
          <span className="card-eyebrow">Current Roles</span>
          <h3>Default plus school-defined roles</h3>
          <div className="feature-list">
            {roles.length ? (
              roles.map((role) => (
                <div key={role.id} className="feature-item">
                  <strong>{role.name}</strong>
                  <span className="muted-copy">
                    {role.description || "No description"} {role.school_id ? "• School custom role" : "• Default role"}
                  </span>
                  <span className="muted-copy">
                    {role.permission_labels?.length ? role.permission_labels.join(", ") : "No permissions assigned"}
                  </span>
                  {role.school_id ? (
                    <div className="button-row">
                      <button className="secondary-button" onClick={() => handleDeleteRole(role.id)}>
                        Delete Role
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="empty-state">No role data is available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="info-card table-panel">
        <div className="table-panel-header">
          <h3>Audit Logs</h3>
          <p className="section-caption">Recent governance trail across fees, roles, notifications, and timetable actions.</p>
        </div>
        {auditLogs.length ? (
          <div className="table-wrapper">
            <table className="data-table wide-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.timestamp)}</td>
                    <td>{item.user_name || "-"}</td>
                    <td>{item.module}</td>
                    <td>{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-panel-header">
            <p className="empty-state">No audit log entries are available yet.</p>
          </div>
        )}
      </div>

      <div className="card-grid">
        <MetricCard
          eyebrow="Security"
          title="Role Readiness"
          value="RBAC"
          note="Role isolation is documented and the navigation has been reorganized around school-admin needs."
          tone="primary"
        />
        <MetricCard
          eyebrow="Accessibility"
          title="Responsive Surface"
          value="WCAG-led"
          note="Semantic labels, strong contrast, focus-safe controls, and mobile-first tables remain part of the UI design."
          tone="neutral"
        />
        <MetricCard
          eyebrow="Operations"
          title="Simplified Modules"
          value="Merged"
          note="Student report and duplicate staff/class workflows are consolidated into broader operational sections."
          tone="accent"
        />
      </div>
    </div>
  );

  const renderActiveSection = () => {
    if (activeSection === "overview") {
      return overviewSection;
    }

    if (activeSection === "students") {
      return studentsSection;
    }

    if (activeSection === "attendance") {
      return attendanceSection;
    }

    if (activeSection === "academics") {
      return academicsSection;
    }

    if (activeSection === "finance") {
      return financeSection;
    }

    if (activeSection === "admissions") {
      return admissionsSection;
    }

    if (activeSection === "timetable") {
      return timetableSection;
    }

    if (activeSection === "notifications") {
      return notificationsSection;
    }

    if (activeSection === "operations") {
      return operationsSection;
    }

    if (activeSection === "governance") {
      return governanceSection;
    }

    return overviewSection;
  };

  return (
    <div className="page-shell">
      <div className="page-card workspace-card">
        <div className="workspace-layout">
          <aside className="workspace-sidebar">
            <div className="workspace-sidebar-top">
              <span className="eyebrow">School Admin Final</span>
              <h2>{admin?.school_name || "School Admin Dashboard"}</h2>
              <p className="muted-copy">
                A cleaner, recommendation-led workspace for analytics, daily operations, and school-wide follow-up.
              </p>
              <div className="hero-meta">
                <span className="meta-chip">{admin?.name || "School Admin"}</span>
                {schoolCode ? <span className="meta-chip">{schoolCode}</span> : null}
                <span className="meta-chip">{activeStats?.students ?? 0} students</span>
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
                  <span className="workspace-nav-label">{section.label}</span>
                  <span className="workspace-nav-copy">{section.detail}</span>
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
                <span className="eyebrow">Command Center</span>
                <h1>School Admin Dashboard</h1>
                <p className="hero-lead">
                  Manage students, admissions, teachers, attendance, academics, and fees for{" "}
                  {admin?.school_name ? `${admin.school_name} (${schoolCode})` : "your school"} from one responsive surface.
                </p>
                <div className="hero-meta">
                  <span className="meta-chip">Principal / Admin workspace</span>
                </div>
              </div>
            </div>

            {visibleMessage ? (
              <p className={`status-message ${error ? "error" : workspaceStatus.type}`}>
                {visibleMessage}
              </p>
            ) : null}

            {renderActiveSection()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default SchoolAdminWorkspaceFinal;
