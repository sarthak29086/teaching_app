import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { api, API_BASE } from "../services/api";

/**
 * StudentCourseDetail - Read-only course view for students
 */
export default function StudentCourseDetail() {
    const { courseId } = useParams();
    const { token } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState("sessions");

    // Course data
    const [course, setCourse] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all data on mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch course
                // Note: /api/my/courses returns courses the student is enrolled in
                const coursesData = await api.get("/api/my/courses", { token });
                const foundCourse = coursesData.find(c => c.id === parseInt(courseId));

                if (foundCourse) {
                    setCourse(foundCourse);

                    // Fetch sessions, announcements and notes from API
                    const [sessionsData, announcementsData, notesData] = await Promise.all([
                        api.get(`/api/courses/${courseId}/sessions`, { token }),
                        api.get(`/api/courses/${courseId}/announcements`, { token }),
                        api.get(`/api/courses/${courseId}/notes`, { token })
                    ]);

                    setSessions(sessionsData || []);
                    setAnnouncements(announcementsData || []);
                    setNotes(notesData || []);
                } else {
                    setError("Course not found or not enrolled");
                }
            } catch (err) {
                setError(err.detail || "Failed to load course");
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchData();
    }, [courseId, token]);


    const navigate = useNavigate();

    const joinSession = async (session) => {
        try {
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

    const tabs = [
        { id: "sessions", label: "Live Sessions", icon: "🎥", count: sessions.length },
        { id: "announcements", label: "Announcements", icon: "📢", count: announcements.length },
        { id: "notes", label: "Notes & Materials", icon: "📝", count: notes.length },
        { id: "assignments", label: "Assignments", icon: "📋", count: 0 },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <Link to="/student" className="text-sky-400 hover:underline">← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
                <div className="max-w-6xl mx-auto px-6 py-5">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/student"
                            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                        >
                            ← Back
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-white">{course?.title}</h1>
                            <p className="text-sm text-slate-400">{course?.description || "No description"}</p>
                        </div>
                        <div className="text-sm text-slate-500">
                            Instructor: <span className="text-slate-300">{course?.teacher_name}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg"
                                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-slate-800"
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-slate-900/30 rounded-2xl border border-slate-800/50 p-6">
                    {/* SESSIONS TAB */}
                    {activeTab === "sessions" && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-white">Live Sessions</h2>

                            {sessions.length === 0 ? (
                                <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                                    <span className="text-4xl mb-4 block">🎥</span>
                                    <p className="text-slate-400">No sessions scheduled yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sessions.map((session) => {
                                        const isLive = session.status === "live";
                                        const isEnded = session.status === "ended";
                                        const startTime = new Date(session.start_time);

                                        return (
                                            <div key={session.id} className={`rounded-xl border p-5 ${isLive ? "bg-red-500/5 border-red-500/30" : "bg-slate-800/30 border-slate-800/50"}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLive ? "bg-red-500/20" : isEnded ? "bg-slate-800" : "bg-sky-500/20"}`}>
                                                            {isLive ? "🔴" : isEnded ? "✅" : "📅"}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-medium text-white">{session.title}</h3>
                                                                {isLive && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-xs text-red-400 animate-pulse">LIVE</span>}
                                                            </div>
                                                            <p className="text-sm text-slate-400">{startTime.toLocaleDateString()} at {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {isLive && (
                                                            <button
                                                                onClick={() => joinSession(session)}
                                                                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 shadow-lg shadow-red-500/20"
                                                            >
                                                                Join Class
                                                            </button>
                                                        )}
                                                        {session.status === "scheduled" && (
                                                            <span className="text-sm text-slate-500">Upcoming</span>
                                                        )}
                                                        {isEnded && <span className="text-sm text-slate-500">Ended</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ANNOUNCEMENTS TAB */}
                    {activeTab === "announcements" && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-white">Announcements</h2>

                            {announcements.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                                    <span className="text-4xl mb-4 block">📢</span>
                                    <p className="text-slate-400">No announcements yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {announcements.map((a) => (
                                        <div key={a.id} className="rounded-xl bg-slate-800/30 border border-slate-800/50 p-5">
                                            <p className="text-white">{a.content}</p>
                                            <p className="text-xs text-slate-500 mt-2">{new Date(a.created_at).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOTES TAB */}
                    {activeTab === "notes" && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-white">Notes & Materials</h2>

                            {notes.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                                    <span className="text-4xl mb-4 block">📝</span>
                                    <p className="text-slate-400">No materials posted yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {notes.map((note) => (
                                        <div key={note.id} className="rounded-xl bg-slate-800/30 border border-slate-800/50 p-5">
                                            <h3 className="font-medium text-white">{note.title}</h3>
                                            {note.content && <p className="text-sm text-slate-400 mt-2">{note.content}</p>}
                                            {note.file_url && (
                                                <div className="mt-3">
                                                    <a
                                                        href={`${API_BASE}${note.file_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors text-sm"
                                                    >
                                                        📎 {note.file_type || "Attachment"}
                                                    </a>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500 mt-3">{new Date(note.created_at).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ASSIGNMENTS TAB */}
                    {activeTab === "assignments" && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-white">Assignments</h2>
                            <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                                <span className="text-4xl mb-4 block">📋</span>
                                <p className="text-slate-400 mb-2">No assignments due</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
