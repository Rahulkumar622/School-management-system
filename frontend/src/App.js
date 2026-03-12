import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import StudentLogin from "./StudentLogin";
import Dashboard from "./Dashboard";

import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import UpdateMarks from "./pages/UpdateMarks";

import MarkAttendance from "./pages/MarkAttendance";

import AddTeacher from "./pages/AddTeacher";
import ViewReports from "./pages/ViewReports";


import ViewStudents from "./pages/ViewStudents";

import AttendanceReports from "./pages/AttendanceReports";
import MarksReports from "./pages/MarksReports";

// import AttendanceReports from "./pages/AttendanceReports";
// import MarksReports from "./pages/MarksReports";


import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

import AddStudent from "./pages/AddStudent";


function App() {
  return (
    <Router>
      <Routes>

        {/* Student */}
        <Route path="/" element={<StudentLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Teacher */}
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/update-marks" element={<UpdateMarks />} />
         
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        
        <Route path="/mark-attendance" element={<MarkAttendance />} />
        <Route path="/view-students" element={<ViewStudents />} />

        <Route path="/attendance-reports" element={<AttendanceReports />}/>
        <Route path="/marks-reports" element={<MarksReports/>}/>


        
        <Route path="/add-teacher" element={<AddTeacher />} />
        <Route path="/view-reports" element={<ViewReports />} />


        <Route path="/add-student" element={<AddStudent />} />

        <Route path="/mark-attendance" element={<MarkAttendance />} />



      </Routes>
    </Router>
  );
}

export default App;
