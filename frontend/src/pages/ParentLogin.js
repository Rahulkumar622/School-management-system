import { useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { setAuthToken, setParentSession } from "../session";
import { isValidEmail, isValidSchoolCode, normalizeEmail, normalizeSchoolCode } from "../utils/validation";
import "../styles/login.css";

function ParentLogin() {
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!schoolCode.trim() || !email.trim() || !password) {
      setError("Enter school code, parent email, and password.");
      return;
    }

    if (!isValidSchoolCode(schoolCode)) {
      setError("Valid school code enter karo.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Valid parent email address enter karo.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/parent-login", {
        schoolCode: normalizeSchoolCode(schoolCode),
        email: normalizeEmail(email),
        password,
      });

      setParentSession(data.parent);
      setAuthToken(data.token);
      navigate("/parent-dashboard", {
        state: data.parent,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to login to parent portal."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <p className="login-eyebrow">Parent Connect</p>
          <h2>Stay close to admissions, academics, and fee updates.</h2>
          <p className="login-subtitle">
            Check linked children, application progress, performance, and fee snapshots from one parent portal.
          </p>
        </div>

        <div className="login-helper-grid">
          <div className="login-helper-card">
            <strong>Admissions visibility</strong>
            <span>Track submitted forms and the current application status online.</span>
          </div>
          <div className="login-helper-card">
            <strong>Child overview</strong>
            <span>Review attendance, performance, and fee details without calling the office.</span>
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
            placeholder="Enter Parent Email"
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
          <strong>Need access?</strong>
          <span>Use the parent account linked by the school admin to your child's student record.</span>
        </p>
      </div>
    </div>
  );
}

export default ParentLogin;
