// src/components/RoleProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * <RoleProtectedRoute requiredRole="teacher"> <TeacherPage/> </RoleProtectedRoute>
 * - requiredRole can be "teacher" or "student"
 * - if user missing or wrong role -> redirect to /logic (or /)
 */
export default function RoleProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="p-6 text-slate-400">Checking access...</div>;

  if (!user) {
    // not logged in
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // wrong role -> send to their correct dashboard
    const fallback = user.role === "teacher" ? "/teacher" : "/student";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

