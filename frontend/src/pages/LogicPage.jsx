//---------------------------------------------------------------------------------------------
//NOT IN USE RIGHT NOW, REPLACED BY ROUTING IN APP.JSX (LOGICREDIRECTOR.JSX DOES THE JOB NOW)
//---------------------------------------------------------------------------------------------

// src/pages/LogicPage.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import TeacherDashboard from "./teacher/TeacherDashboard";
import StudentDashboard from "./StudentDashboard";


export default function LogicPage() {
  const { token, user } = useContext(AuthContext);
  

  if (!user) {
    return <div className="text-slate-400 p-6">Loading user...</div>;
  }

  if (user.role === "teacher") {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
    
}
