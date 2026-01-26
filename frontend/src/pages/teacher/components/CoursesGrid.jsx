// src/pages/teacher/components/CoursesGrid.jsx
import CourseCard from "./CourseCard";

export default function CoursesGrid({ courses }) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {/* Empty State Illustration */}
        <div className="relative mb-8">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-3xl scale-150" />

          {/* Icon container */}
          <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center shadow-2xl">
            <div className="text-6xl">📚</div>
            {/* Floating sparkle */}
            <span className="absolute -top-2 -right-2 text-2xl animate-bounce">✨</span>
          </div>
        </div>

        {/* Text */}
        <h3 className="text-xl font-semibold text-white mb-2">No courses yet</h3>
        <p className="text-slate-400 text-sm text-center max-w-xs mb-6">
          Create your first course and start teaching students from around the world!
        </p>

        {/* Animated hint */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="animate-pulse">👆</span>
          <span>Click "Create Course" in the sidebar to get started</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">
            Showing <span className="text-white font-medium">{courses.length}</span> course{courses.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            Grid
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            List
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, index) => (
          <CourseCard key={course.id} course={course} index={index} />
        ))}
      </div>
    </div>
  );
}
