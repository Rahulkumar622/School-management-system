const ADMIN_STORAGE_KEY = "sms_admin_session";
const PARENT_STORAGE_KEY = "sms_parent_session";
const STUDENT_STORAGE_KEY = "sms_student_session";
const TEACHER_STORAGE_KEY = "sms_teacher_session";

export const getAdminSession = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};

export const setAdminSession = (session) => {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
};

export const getParentSession = () => {
  try {
    return JSON.parse(localStorage.getItem(PARENT_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};

export const setParentSession = (session) => {
  localStorage.setItem(PARENT_STORAGE_KEY, JSON.stringify(session));
};

export const clearParentSession = () => {
  localStorage.removeItem(PARENT_STORAGE_KEY);
};

export const getStudentSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STUDENT_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};

export const setStudentSession = (session) => {
  localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(session));
};

export const clearStudentSession = () => {
  localStorage.removeItem(STUDENT_STORAGE_KEY);
};

export const getTeacherSession = () => {
  try {
    return JSON.parse(localStorage.getItem(TEACHER_STORAGE_KEY) || "null");
  } catch (error) {
    return null;
  }
};

export const setTeacherSession = (session) => {
  localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(session));
};

export const clearTeacherSession = () => {
  localStorage.removeItem(TEACHER_STORAGE_KEY);
};
