// src/components/Header.jsx
import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <span className="text-white font-bold text-sm">TA</span>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-sky-400/20 via-indigo-500/20 to-emerald-400/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </div>
          <div className="hidden sm:block">
            <p className="font-semibold text-white text-sm">TeachApp</p>
            <p className="text-xs text-slate-500">Modern Teaching Platform</p>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* User Info */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                  {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.full_name || user.email}</p>
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
              </div>

              {/* Dashboard Link */}
              <Link
                to={user.role === "teacher" ? "/teacher" : "/student"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 text-sm font-medium text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/20 transition-all"
              >
                <span>{user.role === "teacher" ? "🧑‍🏫" : "🎓"}</span>
                Dashboard
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-600 transition-all"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Not logged in */}
              <Link
                to="/"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
