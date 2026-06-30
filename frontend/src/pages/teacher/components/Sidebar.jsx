// src/pages/teacher/components/Sidebar.jsx
import { useState } from "react";

export default function Sidebar({ onCreateCourse, activeTab = "courses", onTabChange }) {
  const navItems = [
    { id: "courses", label: "My Courses", icon: "📚" },
    { id: "live", label: "Live Classes", icon: "🎥" },
    { id: "drive", label: "Cloud Drive", icon: "📁" },
    { id: "students", label: "Students", icon: "👥" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="w-72 min-h-screen bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-r border-slate-800/50 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-sky-500/20">
            T
          </div>
          <div>
            <h2 className="font-semibold text-white">TeachApp</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Instructor Panel</p>
          </div>
        </div>
      </div>

      {/* Create Course Button */}
      <div className="p-4">
        <button
          onClick={onCreateCourse}
          className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 p-[1px] transition-all hover:shadow-lg hover:shadow-emerald-500/25"
        >
          <div className="relative flex items-center justify-center gap-2 rounded-[11px] bg-slate-900 px-4 py-3 transition-all group-hover:bg-transparent">
            <span className="text-lg">✨</span>
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400 group-hover:text-white transition-colors">
              Create Course
            </span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <p className="px-3 text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
          Navigation
        </p>
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange && onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                  ? "bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-white border border-sky-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {activeTab === item.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom Section - Quick Stats */}
      <div className="p-4 border-t border-slate-800/50">
        <div className="rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">This Month</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +12%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xl font-bold text-white">24</p>
              <p className="text-[10px] text-slate-500">Students</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">8</p>
              <p className="text-[10px] text-slate-500">Classes</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
