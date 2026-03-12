import React, { useState } from "react";
import axios from "axios";

function AddTeacher() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAddTeacher = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/add-teacher",
        {
          name,
          email,
          password,
        }
      );

      alert(res.data);
    } catch (error) {
      console.log(error);
      alert("Error adding teacher ❌");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Add Teacher 👨‍🏫</h2>

      <input
        placeholder="Teacher Name"
        onChange={(e) => setName(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={handleAddTeacher}>
        Add Teacher
      </button>
    </div>
  );
}

export default AddTeacher;
