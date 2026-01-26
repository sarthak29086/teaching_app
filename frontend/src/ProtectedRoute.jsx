// src/ProtectedRoute.jsx
import React, { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return <div style={{padding:20}}>Loading...</div>;
  if (!token) return <Navigate to="/" replace />;
  return children;
}
