// src/pages/teacher/TeacherDashboard.jsx
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../../services/api";
import Sidebar from "./components/Sidebar";
import CoursesGrid from "./components/CoursesGrid";
import CreateCourseModal from "./components/CreateCourseModal";
import CloudDrive from "../../components/CloudDrive";

export default function TeacherDashboard() {
  const { user, token } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("courses");

  // Fetch courses from API on component mount
  // This is the key pattern: useEffect + API call
  useEffect(() => {
    if (!token) return;

    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        // GET /api/my/courses - fetches courses created by this teacher
        const data = await api.get("/api/my/courses", { token });
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError(err.detail || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [token]); // Re-fetch if token changes

  // This function is called when a new course is created
  const handleCourseCreated = (newCourse) => {
    // Add the new course to the list - this updates the UI immediately
    setCourses((prev) => [newCourse, ...prev]);
    setShowModal(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Stats are now computed from real data
  const stats = [
    {
      label: "Total Courses",
      value: courses.length.toString(),
      icon: "📚",
      trend: courses.length > 0 ? `${courses.length} active` : "Create your first",
      color: "from-violet-500/20 to-purple-500/20"
    },
    {
      label: "Total Sessions",
      value: courses.reduce((acc, c) => acc + (c.sessions?.length || 0), 0).toString(),
      icon: "🎥",
      trend: "Across all courses",
      color: "from-sky-500/20 to-blue-500/20"
    },
    {
      label: "Total Students",
      value: courses.reduce((acc, c) => acc + (c.enrollment_count || 0), 0).toString(),
      icon: "👥",
      trend: "Enrolled students",
      color: "from-emerald-500/20 to-teal-500/20"
    },
    {
      label: "Status",
      value: "Active",
      icon: "✅",
      trend: "Account verified",
      color: "from-amber-500/20 to-orange-500/20"
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar onCreateCourse={() => setShowModal(true)} activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-auto">
        {/* Header Section */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {greeting()}, {user?.full_name?.split(" ")[0] || "Teacher"} 👋
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Here's what's happening with your courses today
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search courses..."
                    className="w-64 px-4 py-2.5 pl-10 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>
                </div>

                {/* Notification Bell */}
                <button className="relative p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
                  <span className="text-lg">🔔</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Switcher */}
        {activeTab === "courses" && (
          <div className="px-8 py-6">
            {/* Stats Cards - Now showing real data! */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} border border-slate-800/50 p-5`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                      <p className="text-xs text-slate-400 mt-2">{stat.trend}</p>
                    </div>
                    <div className="text-3xl opacity-80">{stat.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Courses Section */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📚</span>
                My Courses
              </h2>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                + New Course
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 text-center">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-sm hover:bg-red-500/30 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Courses Grid */}
            {!loading && !error && <CoursesGrid courses={courses} />}
          </div>
        )}

        {activeTab === "drive" && (
          <div className="px-8 py-6">
            <CloudDrive />
          </div>
        )}

        {activeTab !== "courses" && activeTab !== "drive" && (
          <div className="px-8 py-16 text-center text-slate-400 bg-slate-900/10 border border-dashed border-slate-800/40 rounded-2xl mx-8 mt-6">
            <span className="text-5xl mb-4 block">🚧</span>
            <h3 className="text-lg font-semibold text-white capitalize">{activeTab} Section</h3>
            <p className="text-xs text-slate-500 mt-1">This section is currently under construction.</p>
          </div>
        )}
      </main>

      {showModal && (
        <CreateCourseModal
          onClose={() => setShowModal(false)}
          onCreate={handleCourseCreated}
        />
      )}
    </div>
  );
}
