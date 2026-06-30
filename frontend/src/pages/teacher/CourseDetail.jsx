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
  const [assignments, setAssignments] = useState([]);
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

  // Assignments states
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignFile, setAssignFile] = useState(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

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

          // Fetch sessions, announcements, notes and assignments from API
          const [sessionsData, announcementsData, notesData, assignmentsData] =
            await Promise.all([
              api.get(`/api/courses/${courseId}/sessions`, { token }),
              api.get(`/api/courses/${courseId}/announcements`, { token }),
              api.get(`/api/courses/${courseId}/notes`, { token }),
              api.get(`/api/courses/${courseId}/assignments`, { token }),
            ]);

          setSessions(sessionsData || []);
          setAnnouncements(announcementsData || []);
          setNotes(notesData || []);
          setAssignments(assignmentsData || []);
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

  const handleSelectAssignment = async (asm) => {
    setSelectedAssignment(asm);
    setLoadingSubmissions(true);
    try {
      const subs = await api.get(`/api/assignments/${asm.id}/submissions`, { token });
      setSubmissions(subs || []);
    } catch (err) {
      alert(err.detail || "Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignDueDate) return;

    setCreatingAssignment(true);
    try {
      const formData = new FormData();
      formData.append("title", assignTitle.trim());
      formData.append("description", assignDesc.trim());
      formData.append("due_date", assignDueDate);
      if (assignFile) {
        formData.append("file", assignFile);
      }

      const newAsm = await api.post(
        `/api/courses/${courseId}/assignments`,
        formData,
        { token }
      );
      setAssignments((prev) => [newAsm, ...prev]);
      setAssignTitle("");
      setAssignDesc("");
      setAssignDueDate("");
      setAssignFile(null);
      setShowCreateAssignment(false);
    } catch (err) {
      alert(err.detail || "Failed to create assignment");
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleGradeSubmission = async (submissionId, marks, feedback) => {
    if (isNaN(parseFloat(marks))) {
      alert("Please enter a valid number for marks");
      return;
    }
    try {
      const updatedSub = await api.post(
        `/api/submissions/${submissionId}/grade`,
        { marks: parseFloat(marks), feedback },
        { token }
      );
      setSubmissions((prev) =>
        prev.map((s) =>
          s.submission && s.submission.id === submissionId
            ? { ...s, submission: { ...s.submission, marks: updatedSub.marks, feedback: updatedSub.feedback } }
            : s
        )
      );
      alert("Grade updated successfully!");
    } catch (err) {
      alert(err.detail || "Failed to submit grade");
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
    {
      id: "assignments",
      label: "Assignments",
      icon: "📋",
      count: assignments.length,
    },
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
              {selectedAssignment ? (
                // SUBMISSIONS VIEW
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedAssignment(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white text-sm"
                      >
                        ← Back to Assignments
                      </button>
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          Submissions: {selectedAssignment.title}
                        </h2>
                        <p className="text-xs text-slate-400">
                          Due: {new Date(selectedAssignment.due_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                    <p className="text-sm text-slate-300">{selectedAssignment.description || "No description provided."}</p>
                    {selectedAssignment.file_url && (
                      <div className="mt-3">
                        <a
                          href={`${API_BASE}${selectedAssignment.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs"
                        >
                          📎 Reference Attachment ({selectedAssignment.file_name})
                        </a>
                      </div>
                    )}
                  </div>

                  {loadingSubmissions ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                      <p className="text-slate-400 text-sm">No students enrolled in this course.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((studentData) => (
                        <SubmissionRow
                          key={studentData.student_id}
                          studentData={studentData}
                          onGrade={handleGradeSubmission}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // ASSIGNMENTS LIST VIEW
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Assignments</h2>
                    {!showCreateAssignment && (
                      <button
                        onClick={() => setShowCreateAssignment(true)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium hover:opacity-90"
                      >
                        + New Assignment
                      </button>
                    )}
                  </div>

                  {showCreateAssignment && (
                    <form
                      onSubmit={handleCreateAssignment}
                      className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5 space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Assignment Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Assignment 1: Introduction to Algebra"
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                          value={assignTitle}
                          onChange={(e) => setAssignTitle(e.target.value)}
                          required
                          disabled={creatingAssignment}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Description
                        </label>
                        <textarea
                          placeholder="Describe instructions, rubrics, etc..."
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
                          rows={3}
                          value={assignDesc}
                          onChange={(e) => setAssignDesc(e.target.value)}
                          disabled={creatingAssignment}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Due Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-sky-500/50"
                            value={assignDueDate}
                            onChange={(e) => setAssignDueDate(e.target.value)}
                            required
                            disabled={creatingAssignment}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Reference Attachment (optional)
                          </label>
                          <input
                            type="file"
                            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20"
                            onChange={(e) => setAssignFile(e.target.files[0])}
                            disabled={creatingAssignment}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateAssignment(false);
                            setAssignFile(null);
                          }}
                          className="px-4 py-2 text-slate-400 hover:text-white"
                          disabled={creatingAssignment}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={creatingAssignment}
                          className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          {creatingAssignment ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create"
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {assignments.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
                      <span className="text-4xl mb-4 block">📋</span>
                      <p className="text-slate-400">No assignments created yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((asm) => {
                        const isOverdue = new Date(asm.due_date) < new Date();
                        return (
                          <div
                            key={asm.id}
                            className="rounded-xl border border-slate-800 bg-slate-800/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <h3 className="font-semibold text-white text-base">{asm.title}</h3>
                              {asm.description && (
                                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{asm.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isOverdue ? "bg-red-500/10 text-red-400" : "bg-sky-500/10 text-sky-400"}`}>
                                  Due: {new Date(asm.due_date).toLocaleString()}
                                </span>
                                {asm.file_url && (
                                  <a
                                    href={`${API_BASE}${asm.file_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-sky-400 hover:underline"
                                  >
                                    📎 {asm.file_name}
                                  </a>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleSelectAssignment(asm)}
                              className="self-start sm:self-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors border border-slate-700"
                            >
                              Submissions
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ studentData, onGrade }) {
  const { student_id, student_name, student_email, submission } = studentData;
  const [marks, setMarks] = useState(
    submission?.marks !== undefined && submission?.marks !== null
      ? submission.marks
      : ""
  );
  const [feedback, setFeedback] = useState(submission?.feedback || "");
  const [editing, setEditing] = useState(
    !submission || submission.marks === null
  );

  useEffect(() => {
    if (submission) {
      setMarks(submission.marks !== null ? submission.marks : "");
      setFeedback(submission.feedback || "");
      setEditing(submission.marks === null);
    } else {
      setMarks("");
      setFeedback("");
      setEditing(false);
    }
  }, [submission]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (marks === "") {
      alert("Please enter marks");
      return;
    }
    onGrade(submission.id, marks, feedback);
    setEditing(false);
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{student_name}</span>
          <span className="text-xs text-slate-500">({student_email})</span>
        </div>

        {submission ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={`${API_BASE}${submission.file_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-medium"
            >
              📄 View PDF
            </a>
            <span className="text-xs text-slate-400">
              Submitted: {new Date(submission.submitted_at).toLocaleString()}
            </span>
            {submission.lateness ? (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] font-semibold text-red-400">
                {submission.lateness}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-400">
                On Time
              </span>
            )}
          </div>
        ) : (
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-400">
            No Submission
          </span>
        )}
      </div>

      {submission && (
        <div className="flex-1 max-w-md w-full">
          {editing ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2 items-end sm:items-center w-full"
            >
              <div className="w-24">
                <input
                  type="number"
                  placeholder="Marks"
                  min="0"
                  max="1000"
                  step="0.5"
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Feedback (optional)..."
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold hover:opacity-90"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800 w-full">
              <div className="text-sm">
                <span className="text-slate-500">Marks: </span>
                <span className="font-bold text-sky-400">{marks}</span>
                {feedback && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="text-slate-500">Feedback: </span>
                    {feedback}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="px-2.5 py-1 rounded border border-slate-850 text-slate-400 hover:text-white text-xs"
              >
                Edit Grade
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
