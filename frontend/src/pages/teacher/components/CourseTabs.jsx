// src/pages/teacher/components/CourseTabs.jsx
export default function CourseTabs() {
  return (
    <div className="flex gap-6 border-b border-slate-800 pb-2">
      <button className="text-emerald-400 border-b-2 border-emerald-400 pb-2">
        Announcements
      </button>
      <button className="text-slate-400 hover:text-white">
        Notes
      </button>
      <button className="text-slate-400 hover:text-white">
        Live Classes
      </button>
    </div>
  );
}
