

import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

import { Bar, Pie } from "react-chartjs-2";

import {
 Chart as ChartJS,
 CategoryScale,
 LinearScale,
 BarElement,
 ArcElement,
 Title,
 Tooltip,
 Legend
} from "chart.js";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import api from "./api";

ChartJS.register(
 CategoryScale,
 LinearScale,
 BarElement,
 ArcElement,
 Title,
 Tooltip,
 Legend
);

function Dashboard() {

 const location = useLocation();
 const student = location.state;

 const [attendance,setAttendance] = useState([]);
 const [marks,setMarks] = useState([]);

 const dashboardRef = useRef();

 useEffect(()=>{

  if (!student?.id) {
   return;
  }

  const loadDashboard = async () => {
   try {
    const [attendanceResponse, marksResponse] = await Promise.all([
     api.get("/attendance"),
     api.get("/marks")
    ]);

    const attendanceRows = (attendanceResponse.data.attendance || []).filter(
     a=>a.student_id === student.id
    );

    const marksRows = (marksResponse.data.marks || []).filter(
     m=>m.student_id === student.id
    );

    setAttendance(attendanceRows);
    setMarks(marksRows);
   } catch (error) {
    console.error("Failed to load dashboard data", error);
   }
  };

  loadDashboard();

 },[student?.id])


 // Attendance Chart

 const present = attendance.filter(a=>a.status==="Present").length;
 const absent = attendance.filter(a=>a.status==="Absent").length;

 const attendanceChart = {

 labels:["Present","Absent"],

 datasets:[{
 data:[present,absent],
 backgroundColor:["green","red"]
 }]

 };


 // Marks Chart

 const marksChart = {

 labels:marks.map(m=>m.subject),

 datasets:[{
 label:"Marks",
 data:marks.map(m=>m.marks),
 backgroundColor:"blue"
 }]

 };


 // PDF Download

 const downloadPDF = async ()=>{

  const canvas = await html2canvas(dashboardRef.current);

  const img = canvas.toDataURL("image/png");

  const pdf = new jsPDF();

  pdf.addImage(img,"PNG",10,10,180,0);

  pdf.save("student-report.pdf");

 };


 return(

 <div style={{
 padding:"40px",
 background:"#f1f5f9",
 minHeight:"100vh"
 }} ref={dashboardRef}>

 <h1>Student Dashboard 🎓</h1>


 {/* Profile */}

 <div style={{
 background:"white",
 padding:"20px",
 borderRadius:"10px",
 boxShadow:"0 5px 10px rgba(0,0,0,0.1)",
 marginBottom:"20px"
 }}>

 <h2>{student.name}</h2>

 <p>Email: {student.email}</p>

 <p>Class: {student.class}</p>

 </div>


 {/* Charts */}

 <div style={{
 display:"flex",
 gap:"40px"
 }}>

 <div style={{
 background:"white",
 padding:"20px",
 borderRadius:"10px",
 width:"400px"
 }}>

 <h3>Attendance</h3>

 <Pie data={attendanceChart}/>

 </div>


 <div style={{
 background:"white",
 padding:"20px",
 borderRadius:"10px",
 width:"400px"
 }}>

 <h3>Marks</h3>

 <Bar data={marksChart}/>

 </div>

 </div>


 <br/>

 <button
 onClick={downloadPDF}

 style={{
 padding:"12px 20px",
 border:"none",
 background:"#2563eb",
 color:"white",
 borderRadius:"6px",
 cursor:"pointer"
 }}

 >

 Download Report PDF

 </button>

 </div>

 );

}

export default Dashboard;
