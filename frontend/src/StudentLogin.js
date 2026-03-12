import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StudentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await axios.post(
      "http://localhost:5000/student-login",
      { email, password }
    );

    if (res.data.success) {
      alert("Login Successful");
      navigate("/dashboard", {
        state: res.data.student,
      });
    } else {
      alert("Invalid Login");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Student Login</h2>

      <input
        placeholder="Enter Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Enter Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default StudentLogin;
