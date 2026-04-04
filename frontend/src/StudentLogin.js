import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "./api";
import { setAuthToken, setStudentSession } from "./session";
import "./styles/login.css";
import logo from "./images/logo.jpg";

function StudentLogin() {
  const [schoolCode, setSchoolCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!schoolCode.trim() || !identifier.trim() || !password) {
      setError("Enter school code, email or student code, and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/student-login", {
        schoolCode: schoolCode.trim().toUpperCase(),
        identifier: identifier.trim(),
        password,
      });

      setStudentSession(data.student);
      setAuthToken(data.token);
      navigate("/student-dashboard", {
        state: data.student,
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
          <p className="login-eyebrow">Student Portal</p>
          <img src={logo} alt="School Logo" className="login-logo" />
          <h2>Track performance without hunting through menus.</h2>
          <p className="login-subtitle">
            View marks, attendance, installment progress, and fee checkout with your school credentials.
          </p>
        </div>

        <div className="login-helper-grid">
          <div className="login-helper-card">
            <strong>School-scoped access</strong>
            <span>Enter your school code to land in the right campus dashboard.</span>
          </div>
          <div className="login-helper-card">
            <strong>Daily essentials</strong>
            <span>See grades, attendance, and pending fee information from one place.</span>
          </div>
        </div>

        <div className="login-form">
          <label className="login-field-label" htmlFor="student-school-code">
            School Code
          </label>
          <input
            id="student-school-code"
            type="text"
            placeholder="Enter School Code"
            value={schoolCode}
            onChange={(event) => setSchoolCode(event.target.value)}
            autoComplete="organization"
          />

          <label className="login-field-label" htmlFor="student-identifier">
            Email or Student Code
          </label>
          <input
            id="student-identifier"
            type="text"
            placeholder="Enter Email or Student Code"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
          />

          <label className="login-field-label" htmlFor="student-password">
            Password
          </label>
          <input
            id="student-password"
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
          <strong>Need help?</strong>
          <span>Field order: first school code, then email or student code, then password.</span>
          <span>Use the email or generated student code shared by your school office or admin.</span>
        </p>
      </div>
    </div>
  );
}

export default StudentLogin;
