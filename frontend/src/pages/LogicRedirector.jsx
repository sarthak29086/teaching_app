// src/pages/LogicRedirector.jsx
import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function LogicRedirector() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    // send teacher -> /teacher, student -> /student, fallback -> /
    if (user.role === "teacher") navigate("/teacher", { replace: true });
    else if (user.role === "student") navigate("/student", { replace: true });
    else navigate("/", { replace: true });
  }, [user, navigate]);

  return (
    <div className="p-8 text-slate-300">
      Redirecting to your dashboard...
    </div>
  );
}
