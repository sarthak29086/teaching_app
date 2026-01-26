// src/pages/BrowseCourses.jsx
import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";

/**
 * BrowseCourses - Browse and enroll in courses
 * 
 * This page:
 * - Lists all available courses (GET /api/courses)
 * - Allows students to enroll (POST /api/courses/{id}/enroll)
 * - Shows enrollment status
 */
export default function BrowseCourses() {
    const { token, user } = useContext(AuthContext);

    const [courses, setCourses] = useState([]);
    const [enrolledIds, setEnrolledIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(null); // Track which course is being enrolled

    // Fetch all courses and user's enrolled courses
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all available courses
                const allCourses = await api.get("/api/courses");
                setCourses(Array.isArray(allCourses) ? allCourses : []);

                // If logged in, fetch enrolled courses to know what's already enrolled
                if (token) {
                    const myCourses = await api.get("/api/my/courses", { token });
                    const ids = new Set(myCourses.map(c => c.id));
                    setEnrolledIds(ids);
                }
            } catch (err) {
                console.error("Failed to fetch courses:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    // Enroll in a course
    const handleEnroll = async (courseId) => {
        if (!token) {
            alert("Please login to enroll in courses");
            return;
        }

        setEnrolling(courseId);
        try {
            // POST /api/courses/{courseId}/enroll
            await api.post(`/api/courses/${courseId}/enroll`, {}, { token });

            // Update enrolled set
            setEnrolledIds(prev => new Set([...prev, courseId]));

        } catch (err) {
            alert(err.detail || "Failed to enroll. You might already be enrolled.");
        } finally {
            setEnrolling(null);
        }
    };

    const isEnrolled = (courseId) => enrolledIds.has(courseId);
    const isTeacher = user?.role === "teacher";

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
                <div className="max-w-6xl mx-auto px-6 py-5">
                    <div className="flex items-center gap-4">
                        <Link
                            to={isTeacher ? "/teacher" : "/student"}
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
                        >
                            ←
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-white">Browse Courses</h1>
                            <p className="text-sm text-slate-400">Discover and enroll in new courses</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Search (UI only for now) */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <input
                            type="text"
                            placeholder="Search courses..."
                            className="w-full px-4 py-3 pl-12 rounded-xl bg-slate-900/80 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && courses.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 rounded-2xl bg-slate-900/50 flex items-center justify-center mx-auto mb-6 text-5xl">
                            📚
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No courses available</h3>
                        <p className="text-slate-400 mb-6">Be the first to create a course!</p>
                        {isTeacher && (
                            <Link
                                to="/teacher"
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium"
                            >
                                Go to Dashboard
                            </Link>
                        )}
                    </div>
                )}

                {/* Courses Grid */}
                {!loading && courses.length > 0 && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => {
                            const enrolled = isEnrolled(course.id);
                            const isOwner = course.teacher_id === user?.id;

                            return (
                                <div
                                    key={course.id}
                                    className="group rounded-2xl bg-slate-900/70 border border-slate-800/50 overflow-hidden hover:border-slate-700/50 transition-all"
                                >
                                    {/* Course Header */}
                                    <div className="h-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />

                                    <div className="p-6">
                                        {/* Course Icon */}
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 flex items-center justify-center text-2xl font-bold text-white mb-4">
                                            {course.title?.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Course Info */}
                                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-sky-400 transition-colors">
                                            {course.title}
                                        </h3>
                                        <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                                            {course.description || "No description provided"}
                                        </p>

                                        {/* Teacher info */}
                                        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
                                            <span>👤</span>
                                            <span>By {isOwner ? "You" : course.teacher_name || "Unknown"}</span>
                                        </div>

                                        {/* Action Button */}
                                        {isOwner ? (
                                            <Link
                                                to={`/teacher/course/${course.id}`}
                                                className="block w-full py-3 rounded-xl bg-slate-800 text-center text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
                                            >
                                                Manage Course →
                                            </Link>
                                        ) : enrolled ? (
                                            <button
                                                disabled
                                                className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium"
                                            >
                                                ✓ Enrolled
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleEnroll(course.id)}
                                                disabled={enrolling === course.id}
                                                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {enrolling === course.id ? (
                                                    <>
                                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Enrolling...
                                                    </>
                                                ) : (
                                                    "Enroll Now"
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
