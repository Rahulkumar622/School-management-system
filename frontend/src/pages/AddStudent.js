import { useState } from "react";
import axios from "axios";

function AddStudent() {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const addStudent = async () => {
    await axios.post("http://localhost:5000/add-student", {
      name,
      className,
      email,
      password,
    });

    alert("Student Added Successfully");
  };

  return (
    <div>
      <h2>Add Student 🎓</h2>

      <input placeholder="Name"
        onChange={(e) => setName(e.target.value)} />
      <br /><br />

      <input placeholder="Class"
        onChange={(e) => setClassName(e.target.value)} />
      <br /><br />

      <input placeholder="Email"
        onChange={(e) => setEmail(e.target.value)} />
      <br /><br />

      <input type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)} />
      <br /><br />

      <button onClick={addStudent}>Add Student</button>
    </div>
  );
}

export default AddStudent;
