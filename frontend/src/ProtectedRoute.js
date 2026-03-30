import { Navigate, Outlet } from "react-router-dom";

import {
  getAdminSession,
  getParentSession,
  getStudentSession,
  getTeacherSession,
} from "./session";

const sessionReaders = {
  admin: getAdminSession,
  parent: getParentSession,
  student: getStudentSession,
  teacher: getTeacherSession,
};

function hasSession(sessionType) {
  const readSession = sessionReaders[sessionType];
  if (!readSession) {
    return false;
  }

  const session = readSession();
  return Boolean(session?.id || session?.role);
}

function ProtectedRoute({ allowedSessions = [], redirectTo = "/" }) {
  const isAllowed = allowedSessions.some((sessionType) => hasSession(sessionType));

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
