// src/pages/teacher/CourseDetail.jsx
import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { api, API_BASE } from "../../services/api";

/**
 * CourseDetail - Full course management page for teachers
 *
 * All data now persists to the database!
 * - Sessions: Create/Start/End live classes
 * - Announcements: Post updates to students (persisted)
 * - Notes: Add study materials (persisted)
 */
export default function CourseDetail() {
  const { courseId } = useParams();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("sessions");

  // Course data
  const [course, setCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionTime, setNewSessionTime] = useState("");
  const [creating, setCreating] = useState(false);

  const [announcementText, setAnnouncementText] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteFile, setNoteFile] = useState(null);
  const [addingNote, setAddingNote] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch course
        const coursesData = await api.get("/api/my/courses", { token });
        const foundCourse = coursesData.find(
          (c) => c.id === parseInt(courseId),
        );

        if (foundCourse) {
          setCourse(foundCourse);

          // Fetch sessions, announcements and notes from API
          const [sessionsData, announcementsData, notesData] =
            await Promise.all([
              api.get(`/api/courses/${courseId}/sessions`, { token }),
              api.get(`/api/courses/${courseId}/announcements`, { token }),
              api.get(`/api/courses/${courseId}/notes`, { token }),
            ]);

          setSessions(sessionsData || []);
          setAnnouncements(announcementsData || []);
          setNotes(notesData || []);
        } else {
          setError("Course not found");
        }
      } catch (err) {
        setError(err.detail || "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchData();
  }, [courseId, token]);

  // Session handlers
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;

    setCreating(true);
    try {
      const newSession = await api.post(
        `/api/courses/${courseId}/sessions`,
        {
          title: newSessionTitle.trim(),
          start_time: newSessionTime || new Date().toISOString(),
        },
        { token },
      );
      setSessions((prev) => [newSession, ...prev]);
      setNewSessionTitle("");
      setNewSessionTime("");
      setShowCreateSession(false);
    } catch (err) {
      alert(err.detail || "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      const response = await api.post(
        `/api/sessions/${sessionId}/join`,
        {},
        { token },
      );
      if (response.livekit_token) {
        navigate(`/classroom/${sessionId}`, {
          state: {
            livekit_token: response.livekit_token,
            session: response.session,
          },
        });
      } else {
        alert("Failed to get classroom token");
      }
    } catch (err) {
      alert(err.detail || "Failed to start session");
    }
  };

  const handleEndSession = async (sessionId) => {
    try {
      const updated = await api.post(
        `/api/sessions/${sessionId}/end`,
        {},
        { token },
      );
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s)),
      );
    } catch (err) {
      alert(err.detail || "Failed to end session");
    }
  };

  // Announcement handlers - NOW PERSISTED TO DATABASE
  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) return;

    setPostingAnnouncement(true);
    try {
      const newAnnouncement = await api.post(
        `/api/courses/${courseId}/announcements`,
        { content: announcementText.trim() },
        { token },
      );
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      setAnnouncementText("");
    } catch (err) {
      alert(err.detail || "Failed to post announcement");
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await api.del(`/api/announcements/${id}`, { token });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.detail || "Failed to delete");
    }
  };

  // Note handlers - NOW PERSISTED TO DATABASE
  const handleAddNote = async () => {
    if (!noteTitle.trim()) return;

    setAddingNote(true);
    try {
      const formData = new FormData();
      formData.append("title", noteTitle.trim());
      formData.append("content", noteContent);
      if (noteFile) {
        formData.append("file", noteFile);
      }

      const newNote = await api.post(
        `/api/courses/${courseId}/notes`,
        formData,
        { token },
      );
      setNotes((prev) => [newNote, ...prev]);
      setNoteTitle("");
      setNoteContent("");
      setNoteFile(null);
    } catch (err) {
      alert(err.detail || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm("Delete this note?")) return;
    try {
      await api.del(`/api/notes/${id}`, { token });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert(err.detail || "Failed to delete");
    }
  };

  const tabs = [
    {
      id: "sessions",
      label: "Live Sessions",
      icon: "🎥",
      count: sessions.length,
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: "📢",
      count: announcements.length,
    },
    {
      id: "notes",
      label: "Notes & Materials",
      icon: "📝",
      count: notes.length,
    },
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
          <Link to="/teacher" className="text-sky-400 hover:underline">
            ← Back to Dashboard
          </Link>
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
              to="/teacher"
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            >
              ← Back
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">{course?.title}</h1>
              <p className="text-sm text-slate-400">
                {course?.description || "No description"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl bg-slate-900/50 border border-slate-800/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Sessions
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {sessions.length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/50 border border-slate-800/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Live Now
            </p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {sessions.filter((s) => s.status === "live").length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/50 border border-slate-800/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Students
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {course?.enrollment_count || 0}
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/50 border border-slate-800/50 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Materials
            </p>
            <p className="text-2xl font-bold text-white mt-1">{notes.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? "bg-white/20" : "bg-slate-800"
                  }`}
                >
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Live Sessions
                </h2>
                <button
                  onClick={() => setShowCreateSession(true)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:opacity-90"
                >
                  + New Session
                </button>
              </div>

              {showCreateSession && (
                <form
                  onSubmit={handleCreateSession}
                  className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 space-y-4"
                >
                  <input
                    type="text"
                    placeholder="Session title (e.g., Week 1: Introduction)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-sky-500/50"
                    value={newSessionTime}
                    onChange={(e) => setNewSessionTime(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateSession(false)}
                      className="px-4 py-2 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50"
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>
                  </div>
                </form>
              )}

              {sessions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-4xl mb-4 block">🎥</span>
                  <p className="text-slate-400">
                    No sessions yet. Create your first live session!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const isLive = session.status === "live";
                    const isEnded = session.status === "ended";
                    const startTime = new Date(session.start_time);

                    return (
                      <div
                        key={session.id}
                        className={`rounded-xl border p-5 ${isLive ? "bg-red-500/5 border-red-500/30" : "bg-slate-800/30 border-slate-800/50"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLive ? "bg-red-500/20" : isEnded ? "bg-slate-800" : "bg-sky-500/20"}`}
                            >
                              {isLive ? "🔴" : isEnded ? "✅" : "📅"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-white">
                                  {session.title}
                                </h3>
                                {isLive && (
                                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-xs text-red-400 animate-pulse">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-400">
                                {startTime.toLocaleDateString()} at{" "}
                                {startTime.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.status === "scheduled" && (
                              <button
                                onClick={() => handleStartSession(session.id)}
                                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
                              >
                                Start Live
                              </button>
                            )}
                            {isLive && (
                              <button
                                onClick={() => handleEndSession(session.id)}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                              >
                                End Session
                              </button>
                            )}
                            {isEnded && (
                              <span className="text-sm text-slate-500">
                                Ended
                              </span>
                            )}
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
              <h2 className="text-lg font-semibold text-white">
                Announcements
              </h2>

              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
                <textarea
                  placeholder="Write an announcement for your students..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
                  rows={3}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  disabled={postingAnnouncement}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handlePostAnnouncement}
                    disabled={!announcementText.trim() || postingAnnouncement}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {postingAnnouncement ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                        Posting...
                      </>
                    ) : (
                      "Post Announcement"
                    )}
                  </button>
                </div>
              </div>

              {announcements.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-4xl mb-4 block">📢</span>
                  <p className="text-slate-400">No announcements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl bg-slate-800/30 border border-slate-800/50 p-5 group"
                    >
                      <div className="flex justify-between items-start">
                        <p className="text-white flex-1">{a.content}</p>
                        <button
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                        >
                          🗑️
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">
                Notes & Materials
              </h2>

              <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 space-y-4">
                <input
                  type="text"
                  placeholder="Note title (e.g., Week 1 - Introduction)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  disabled={addingNote}
                />
                <textarea
                  placeholder="Note content..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  disabled={addingNote}
                />

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Attach file:</span>
                  <input
                    type="file"
                    className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20"
                    onChange={(e) => setNoteFile(e.target.files[0])}
                    disabled={addingNote}
                  />
                  {noteFile && (
                    <button
                      onClick={() => setNoteFile(null)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteTitle.trim() || addingNote}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingNote ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                        Adding...
                      </>
                    ) : (
                      "Add Note"
                    )}
                  </button>
                </div>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-4xl mb-4 block">📝</span>
                  <p className="text-slate-400">
                    No notes yet. Add study materials for your students!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl bg-slate-800/30 border border-slate-800/50 p-5 group"
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-white">{note.title}</h3>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-4"
                        >
                          🗑️
                        </button>
                      </div>
                      {note.content && (
                        <p className="text-sm text-slate-400 mt-2">
                          {note.content}
                        </p>
                      )}
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
                      <p className="text-xs text-slate-500 mt-3">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
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
                <p className="text-slate-400 mb-2">
                  Assignments feature coming soon!
                </p>
                <p className="text-xs text-slate-500">
                  Create and grade student assignments
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
