import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import StudentLogin from "./StudentLogin";
import StudentDashboard from "./StudentDashboard";
import StudentCheckout from "./pages/StudentCheckout";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import BulkAttendance from "./pages/BulkAttendance";
import UpdateMarks from "./pages/UpdateMarks";
import MarkAttendance from "./pages/MarkAttendance";
import AddTeacher from "./pages/AddTeacher";
import ViewReports from "./pages/ViewReports";
import LoginSelect from "./LoginSelect";
import ViewStudents from "./pages/ViewStudents";
import AttendanceReports from "./pages/AttendanceReports";
import MarksReports from "./pages/MarksReports";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AddStudent from "./pages/AddStudent";
import SchoolManagement from "./pages/SchoolManagement";
import PaymentReports from "./pages/PaymentReports";
import AdmissionForm from "./pages/AdmissionForm";
import ParentLogin from "./pages/ParentLogin";
import ParentDashboard from "./pages/ParentDashboard";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginSelect />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/parent-login" element={<ParentLogin />} />
        <Route path="/admission-form" element={<AdmissionForm />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route
          element={<ProtectedRoute allowedSessions={["student"]} redirectTo="/student-login" />}
        >
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/student-checkout" element={<StudentCheckout />} />
        </Route>

        <Route
          element={<ProtectedRoute allowedSessions={["teacher"]} redirectTo="/teacher-login" />}
        >
          <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
          <Route path="/bulk-attendance" element={<BulkAttendance />} />
          <Route path="/update-marks" element={<UpdateMarks />} />
          <Route path="/mark-attendance" element={<MarkAttendance />} />
        </Route>

        <Route
          element={<ProtectedRoute allowedSessions={["parent"]} redirectTo="/parent-login" />}
        >
          <Route path="/parent-dashboard" element={<ParentDashboard />} />
        </Route>

        <Route
          element={<ProtectedRoute allowedSessions={["admin"]} redirectTo="/admin-login" />}
        >
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/school-management" element={<SchoolManagement />} />
          <Route path="/attendance-reports" element={<AttendanceReports />} />
          <Route path="/marks-reports" element={<MarksReports />} />
          <Route path="/payment-reports" element={<PaymentReports />} />
          <Route path="/add-student" element={<AddStudent />} />
          <Route path="/add-teacher" element={<AddTeacher />} />
          <Route path="/view-reports" element={<ViewReports />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedSessions={["admin", "teacher"]}
              redirectTo="/"
            />
          }
        >
          <Route path="/view-students" element={<ViewStudents />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
