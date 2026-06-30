// src/pages/StudentDashboard.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import CloudDrive from "../components/CloudDrive";

/**
 * StudentDashboard - Main dashboard for students
 * 
 * Shows:
 * - Live sessions (priority)
 * - Quick actions (Browse Courses, etc.)
 * - Upcoming classes
 * - Enrolled courses
 */
export default function StudentDashboard() {
  const { token, user } = useContext(AuthContext);

  // State
  const [sessions, setSessions] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'drive'

  // Fetch enrolled courses
  useEffect(() => {
    if (!token) return;

    const fetchCourses = async () => {
      try {
        const data = await api.get("/api/my/courses", { token });
        setEnrolledCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, [token]);

  // Fetch sessions
  useEffect(() => {
    if (!token) return;

    const fetchSessions = async () => {
      try {
        const data = await api.get("/api/my/sessions", { token });
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.detail || "Could not load sessions");
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [token]);


  const navigate = useNavigate(); // Helper to be added

  const joinSession = async (session) => {
    try {
      if (!session.id) return;
      const response = await api.post(`/api/sessions/${session.id}/join`, {}, { token });
      if (response.livekit_token) {
        navigate(`/classroom/${session.id}`, {
          state: {
            livekit_token: response.livekit_token,
            session: response.session
          }
        });
      } else {
        alert("Failed to get classroom token");
      }
    } catch (err) {
      alert(err.detail || "Failed to join session");
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const liveSessions = sessions.filter((s) => s.status === "live");
  const upcomingSessions = sessions.filter((s) => s.status === "scheduled");

  // Stats from real data
  const stats = [
    {
      label: "Enrolled Courses",
      value: enrolledCourses.length.toString(),
      icon: "📚",
      color: "from-violet-500/20 to-purple-500/20"
    },
    {
      label: "Upcoming Classes",
      value: upcomingSessions.length.toString(),
      icon: "📅",
      color: "from-sky-500/20 to-blue-500/20"
    },
    {
      label: "Live Now",
      value: liveSessions.length.toString(),
      icon: "🔴",
      color: "from-red-500/20 to-orange-500/20"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {greeting()}, {user?.full_name?.split(" ")[0] || "Student"} 👋
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Ready to learn something new today?
              </p>
            </div>

            <div className="flex items-center gap-3">
              {liveSessions.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-medium text-red-400">
                    {liveSessions.length} Live Now
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                  {user?.full_name?.charAt(0) || "S"}
                </div>
                <span className="text-sm text-slate-300">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeView === "dashboard" ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} border border-slate-800/50 p-5`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                    </div>
                    <div className="text-4xl opacity-70">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Live Classes - Priority Section */}
              {liveSessions.length > 0 && (
                <div className="lg:col-span-3 order-first">
                  <div className="rounded-2xl bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent border border-red-500/20 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <h3 className="text-lg font-semibold text-white">Live Now</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {liveSessions.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 hover:border-red-500/30 transition-colors"
                        >
                          <h4 className="font-semibold text-white mb-1">{s.title}</h4>
                          <p className="text-xs text-slate-400 mb-4">{s.course_title}</p>
                          <button
                            onClick={() => joinSession(s)}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold hover:opacity-90"
                          >
                            🎥 Join Live Class
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800/50 p-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <span>⚡</span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/browse-courses"
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50 transition-all"
                  >
                    <span className="text-xl">🔍</span>
                    <div>
                      <p className="text-sm font-medium text-white">Browse Courses</p>
                      <p className="text-xs text-slate-500">Find new courses to enroll</p>
                    </div>
                  </Link>

                  <button 
                    onClick={() => setActiveView("dashboard")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50 transition-all text-left"
                  >
                    <span className="text-xl">📚</span>
                    <div>
                      <p className="text-sm font-medium text-white">My Courses</p>
                      <p className="text-xs text-slate-500">{enrolledCourses.length} enrolled</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveView("drive")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50 transition-all text-left"
                  >
                    <span className="text-xl">📁</span>
                    <div>
                      <p className="text-sm font-medium text-white">Cloud Drive</p>
                      <p className="text-xs text-slate-500">Shared files & folders</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upcoming Classes */}
              <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800/50 p-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <span>📅</span>
                  Upcoming Classes
                </h3>

                {loadingSessions && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                  </div>
                )}

                {error && (
                  <div className="text-center py-8">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {!loadingSessions && upcomingSessions.length === 0 && !error && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4 text-3xl">
                      📅
                    </div>
                    <p className="text-sm text-slate-400 mb-2">No upcoming classes</p>
                    <Link to="/browse-courses" className="text-xs text-sky-400 hover:underline">
                      Browse courses to enroll →
                    </Link>
                  </div>
                )}

                <div className="space-y-3">
                  {upcomingSessions.map((s) => {
                    const start = new Date(s.start_time);
                    const dateStr = start.toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric"
                    });
                    const timeStr = start.toLocaleTimeString([], {
                      hour: "2-digit", minute: "2-digit"
                    });

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-800/50 hover:border-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/20 flex items-center justify-center text-sky-400 font-bold">
                            {start.getDate()}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{s.title}</h4>
                            <p className="text-xs text-slate-400">
                              {s.course_title} · {dateStr} at {timeStr}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">Scheduled</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enrolled Courses */}
              {enrolledCourses.length > 0 && (
                <div className="lg:col-span-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>📚</span>
                    My Enrolled Courses
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {enrolledCourses.map((course) => (
                      <Link
                        key={course.id}
                        to={`/student/course/${course.id}`}
                        className="rounded-xl bg-slate-900/50 border border-slate-800/50 p-5 hover:border-slate-700/50 transition-colors block group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center text-white font-bold mb-3 group-hover:scale-110 transition-transform">
                          {course.title?.charAt(0)}
                        </div>
                        <h4 className="font-medium text-white mb-1 group-hover:text-sky-400 transition-colors">{course.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setActiveView("dashboard")}
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Dashboard
            </button>
            <CloudDrive />
          </div>
        )}
      </div>
    </div>
  );
}
