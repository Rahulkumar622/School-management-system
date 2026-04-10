import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { setAdminSession, setAuthToken } from "../session";
import { isValidEmail, isValidSchoolCode, normalizeEmail, normalizeSchoolCode } from "../utils/validation";
import "../styles/login.css";

function AdminLogin() {
  const [role, setRole] = useState("school_admin");
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schools, setSchools] = useState([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadSchools = async () => {
      try {
        const { data } = await api.get("/schools");

        if (!isMounted) {
          return;
        }

        setSchools(Array.isArray(data?.schools) ? data.schools : []);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.response?.data?.message || "School list load nahi ho pa rahi.");
      } finally {
        if (isMounted) {
          setIsLoadingSchools(false);
        }
      }
    };

    loadSchools();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async () => {
    if (!email.trim() || !password || (role === "school_admin" && !schoolCode.trim())) {
      setError("Fill in the required admin credentials first.");
      return;
    }

    if (role === "school_admin" && !isValidSchoolCode(schoolCode)) {
      setError("School code 2 se 20 characters ka hona chahiye.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Valid email address enter karo.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const payload = {
      role,
      schoolCode: normalizeSchoolCode(schoolCode),
      email: normalizeEmail(email),
      password,
    };
    
    console.log('[AdminLogin] Attempting login with:', { ...payload, password: '***' });

    try {
      const { data } = await api.post("/admin-login", payload);

      console.log('[AdminLogin] Login successful:', data);
      setAdminSession(data.admin);
      setAuthToken(data.token);
      navigate("/admin-dashboard", {
        state: data.admin,
      });
    } catch (requestError) {
      console.error('[AdminLogin] Login failed:', requestError);
      console.error('[AdminLogin] Error response:', requestError.response?.data);
      console.error('[AdminLogin] Error status:', requestError.response?.status);
      
      if (!requestError.response) {
        setError("Server se connection nahi ho pa raha. API URL/CORS check karein.");
      } else {
        setError(requestError.response?.data?.message || "Invalid owner/admin credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <p className="login-eyebrow">Owner And Admin Access</p>
          <h2>Control platform operations without opening a dozen tabs.</h2>
          <p className="login-subtitle">
            Switch between software owner visibility and school admin operations from one clean sign-in flow.
          </p>
        </div>

        <div className="login-helper-grid">
          <div className="login-helper-card">
            <strong>Software owner mode</strong>
            <span>Review client schools, billing status, and overall platform activity.</span>
          </div>
          <div className="login-helper-card">
            <strong>Principal / admin mode</strong>
            <span>Manage students, teachers, classes, payments, reports, and admissions for one campus.</span>
          </div>
        </div>

        <div className="login-form">
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="school_admin">Principal / School Admin</option>
            <option value="super_admin">Software Owner</option>
          </select>

          {role === "school_admin" ? (
            <select
              value={schoolCode}
              onChange={(event) => setSchoolCode(event.target.value)}
              autoComplete="organization"
              disabled={isLoadingSchools || schools.length === 0}
            >
              <option value="">
                {isLoadingSchools
                  ? "Loading schools..."
                  : schools.length > 0
                    ? "Select School Code"
                    : "No schools found"}
              </option>
              {schools.map((school) => (
                <option key={school.id || school.code} value={school.code}>
                  {school.name} ({school.code})
                </option>
              ))}
            </select>
          ) : null}

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
                login();
              }
            }}
          />

          {error ? <p className="login-message error">{error}</p> : null}

          <button onClick={login} disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Login"}
          </button>
        </div>

        <p className="login-note">
          <strong>Access note</strong>
          <span>Principal / school admin login needs school code, email, and password. Software owner login does not.</span>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
