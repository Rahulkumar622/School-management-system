import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function TeacherLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  // const handleLogin = async () => {
  //   try {
  //     const res = await axios.post(
  //       "http://localhost:5000/teacher-login",
  //       { email, password }
  //     );

  //     if (res.data === "Login Success") {
  //       navigate("/teacher-dashboard");
  //     } else {
  //       alert("Invalid Login");
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     alert("Server Error");
  //   }
  // };


const handleLogin = async () => {
  try {
    const res = await axios.post(
      "http://localhost:5000/teacher-login",
      { email, password }
    );

    // If teacher found
    if (res.data && res.data.id) {
      alert("Login Successful ✅");

      navigate("/teacher-dashboard", {
        state: res.data,
      });
    } else {
      alert("Invalid Login ❌");
    }
  } catch (error) {
    console.log(error);
    alert("Server Error ❌");
  }
};


  return (
    <div style={{ padding: "20px" }}>
      <h2>Teacher Login 👨‍🏫</h2>

      <input
        type="email"
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

export default TeacherLogin;
