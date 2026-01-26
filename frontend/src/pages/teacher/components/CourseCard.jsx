// src/pages/teacher/components/CourseCard.jsx
import { useNavigate } from "react-router-dom";

const gradients = [
  "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
  "from-sky-500/20 via-blue-500/10 to-indigo-500/20",
  "from-emerald-500/20 via-teal-500/10 to-cyan-500/20",
  "from-amber-500/20 via-orange-500/10 to-rose-500/20",
  "from-pink-500/20 via-rose-500/10 to-red-500/20",
];

const accentColors = [
  "from-violet-400 to-fuchsia-400",
  "from-sky-400 to-indigo-400",
  "from-emerald-400 to-cyan-400",
  "from-amber-400 to-rose-400",
  "from-pink-400 to-red-400",
];

export default function CourseCard({ course, index = 0 }) {
  const navigate = useNavigate();
  const gradientIndex = index % gradients.length;

  return (
    <div
      onClick={() => navigate(`/teacher/course/${course.id}`)}
      className={`group cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[gradientIndex]} border border-slate-700/50 p-[1px] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10`}
    >
      {/* Inner Card */}
      <div className="relative h-full rounded-[15px] bg-slate-900/90 backdrop-blur-sm p-5 flex flex-col">
        {/* Top accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentColors[gradientIndex]} opacity-60`} />

        {/* Course Icon/Thumbnail */}
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accentColors[gradientIndex]} flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg`}>
          {course.title?.charAt(0)?.toUpperCase() || "C"}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
          {course.title}
        </h3>
        <p className="text-sm text-slate-400 line-clamp-2 flex-1">
          {course.description || "No description provided"}
        </p>

        {/* Footer Stats */}
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>👥</span>
              <span>{course.enrollment_count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>📹</span>
              <span>{course.sessions?.length || 0}</span>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 group-hover:bg-sky-500/10 group-hover:text-sky-400 transition-colors">
            View →
          </span>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className={`absolute -inset-1 bg-gradient-to-r ${accentColors[gradientIndex]} opacity-20 blur-xl`} />
      </div>
    </div>
  );
}
