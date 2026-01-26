// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute"; // your existing
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Header from "./components/Header";

import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import LogicPage from "./pages/LogicPage";
import LogicRedirector from "./pages/LogicRedirector";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import AuthLanding from "./pages/AuthLanding"; // optional if you separated it; otherwise reuse existing

import CourseDetail from "./pages/teacher/CourseDetail";
import StudentCourseDetail from "./pages/StudentCourseDetail";
import BrowseCourses from "./pages/BrowseCourses";
import Classroom from "./pages/Classroom";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 relative overflow-hidden">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.14),_transparent_55%)]" />
        <div className="relative z-10">
          {/* global header */}
          <Header />

          <main>
            <Routes>
              {/* public */}
              <Route path="/" element={<AuthLanding />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />

              <Route
                path="/teacher/course/:courseId"
                element={
                  <ProtectedRoute>
                    <CourseDetail />
                  </ProtectedRoute>
                }
              />

              {/* logic entrypoint: redirect to role-specific dashboard */}
              <Route
                path="/logic"
                element={
                  <ProtectedRoute>
                    <LogicRedirector />
                  </ProtectedRoute>
                }
              />

              {/* role-protected routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute requiredRole="teacher">
                      <TeacherDashboard />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute requiredRole="student">
                      <StudentDashboard />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/student/course/:courseId"
                element={
                  <ProtectedRoute>
                    <RoleProtectedRoute requiredRole="student">
                      <StudentCourseDetail />
                    </RoleProtectedRoute>
                  </ProtectedRoute>
                }
              />

              {/* Browse courses - accessible to all logged-in users */}
              <Route
                path="/browse-courses"
                element={
                  <ProtectedRoute>
                    <BrowseCourses />
                  </ProtectedRoute>
                }
              />

              {/* Live Classroom Route */}
              <Route
                path="/classroom/:sessionId"
                element={
                  <ProtectedRoute>
                    <Classroom />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
