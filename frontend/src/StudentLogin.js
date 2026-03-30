import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "./api";
import { setStudentSession } from "./session";
import "./styles/login.css";
import logo from "./images/logo.jpg";

function StudentLogin() {
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

    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/student-login", {
        schoolCode: schoolCode.trim().toUpperCase(),
        email: email.trim(),
        password,
      });

      setStudentSession(data.student);
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
          <strong>Need help?</strong>
          <span>Use the email and password issued by your school office or admin.</span>
        </p>
      </div>
    </div>
  );
}

export default StudentLogin;
