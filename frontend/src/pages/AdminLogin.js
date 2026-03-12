import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = () => {
    if (email === "admin@gmail.com" && password === "1234") {
      navigate("/admin-dashboard");
    } else {
      alert("Invalid Admin Login");
    }
  };

  return (
    <div>
      <h2>Admin Login 🏫</h2>

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

      <button onClick={login}>Login</button>
    </div>
  );
}

export default AdminLogin;
