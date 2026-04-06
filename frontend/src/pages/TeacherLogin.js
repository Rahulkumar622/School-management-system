import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { setAuthToken, setTeacherSession } from "../session";
import { isValidEmail, isValidSchoolCode, normalizeEmail, normalizeSchoolCode } from "../utils/validation";
import "../styles/login.css";

function TeacherLogin() {
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!schoolCode.trim() || !email.trim() || !password) {
      setError("Enter school code, email and password.");
      return;
    }

    if (!isValidSchoolCode(schoolCode)) {
      setError("Valid school code enter karo.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Valid email address enter karo.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/teacher-login", {
        schoolCode: normalizeSchoolCode(schoolCode),
        email: normalizeEmail(email),
        password,
      });

      setTeacherSession(data.teacher);
      setAuthToken(data.token);

      navigate("/teacher-dashboard", {
        state: data.teacher,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to login right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <p className="login-eyebrow">Teacher Workspace</p>
          <h2>Run classroom operations from one focused screen.</h2>
          <p className="login-subtitle">
            Mark attendance, update marks, and review fee-sensitive student context for your school.
          </p>
        </div>

        <div className="login-helper-grid">
          <div className="login-helper-card">
            <strong>Classroom ready</strong>
            <span>Attendance and marks flows stay connected to the same student records.</span>
          </div>
          <div className="login-helper-card">
            <strong>School filtered</strong>
            <span>Every action stays limited to the campus linked with your account.</span>
          </div>
        </div>

        <div className="login-form">
          <input
            type="text"
            placeholder="Enter School Code"
            value={schoolCode}
            onChange={(event) => setSchoolCode(event.target.value)}
            autoComplete="organization"
          />

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleLogin();
              }
            }}
          />

          {error ? <p className="login-message error">{error}</p> : null}

          <button onClick={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Login"}
          </button>
        </div>

        <p className="login-note">
          <strong>Tip</strong>
          <span>Use the same credentials your school admin created for staff access.</span>
        </p>
      </div>
    </div>
  );
}

export default TeacherLogin;
