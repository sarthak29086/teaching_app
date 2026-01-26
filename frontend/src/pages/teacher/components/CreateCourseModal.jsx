// src/pages/teacher/components/CreateCourseModal.jsx
import { useState, useContext } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { api } from "../../../services/api";

/**
 * CreateCourseModal - Creates a new course via API
 * 
 * HOW IT WORKS:
 * 1. User fills in course title and description
 * 2. On submit, we POST to /api/courses with the data
 * 3. Backend creates the course in PostgreSQL
 * 4. Backend returns the new course object
 * 5. We call onCreate(newCourse) to update the parent component's state
 */
export default function CreateCourseModal({ onClose, onCreate }) {
  const { token } = useContext(AuthContext);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // UI state - these help show loading spinners and error messages
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault(); // Prevent page refresh

    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // POST /api/courses - Create a new course
      // The backend requires authentication (token) and checks if you're a teacher
      const newCourse = await api.post(
        "/api/courses",
        { title: title.trim(), description: description.trim() },
        { token }
      );

      // Success! Call the parent's callback with the new course
      // This updates the courses list in TeacherDashboard
      onCreate(newCourse);

    } catch (err) {
      // Show error to user
      console.error("Failed to create course:", err);
      setError(err.detail || "Failed to create course. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header gradient bar */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Create New Course
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Fill in the details below to create your course
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Course Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Introduction to Machine Learning"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                placeholder="What will students learn in this course?"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400">⚠️</span>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Quick Tips */}
            <div className="rounded-xl bg-sky-500/5 border border-sky-500/10 p-4">
              <p className="text-xs font-medium text-sky-400 mb-2">💡 Pro Tips</p>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Use a clear, descriptive title</li>
                <li>• Mention what students will achieve</li>
                <li>• You can add sessions after creation</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Course
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
