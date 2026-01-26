// src/components/auth/Register.jsx
import React, { useState, useContext } from "react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", {
        email,
        password,
        full_name: fullName,
        role,
      });
      const loginRes = await api.post("/api/auth/login", { email, password });
      if (loginRes?.access_token) {
        login(loginRes.access_token);
        navigate("/logic");
      } else {
        setError("Registered but auto-login failed");
      }
    } catch (err) {
      setError(err.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyles = "w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all";

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          Full Name
        </label>
        <input
          type="text"
          className={inputStyles}
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          Email Address
        </label>
        <input
          type="email"
          className={inputStyles}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          Password
        </label>
        <input
          type="password"
          className={inputStyles}
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={128}
        />
        <div className="flex items-center gap-2 mt-2">
          <div className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded-full ${password.length >= 12 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          <div className={`h-1 flex-1 rounded-full ${password.length >= 16 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
          <span className="text-xs text-slate-500">
            {password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
          </span>
        </div>
      </div>

      {/* Role Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
          I am a...
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`p-4 rounded-xl border text-left transition-all ${role === "student"
                ? "bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border-sky-500/30 shadow-lg shadow-sky-500/10"
                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
              }`}
          >
            <span className="text-2xl block mb-2">🎓</span>
            <span className={`text-sm font-medium ${role === "student" ? "text-white" : "text-slate-300"}`}>
              Student
            </span>
            <p className="text-xs text-slate-500 mt-1">Learn and grow</p>
          </button>

          <button
            type="button"
            onClick={() => setRole("teacher")}
            className={`p-4 rounded-xl border text-left transition-all ${role === "teacher"
                ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
              }`}
          >
            <span className="text-2xl block mb-2">🧑‍🏫</span>
            <span className={`text-sm font-medium ${role === "teacher" ? "text-white" : "text-slate-300"}`}>
              Teacher
            </span>
            <p className="text-xs text-slate-500 mt-1">Teach and inspire</p>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <span className="text-red-400">⚠️</span>
          <p className="text-sm text-red-300">{String(error)}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </>
        ) : (
          <>Create account →</>
        )}
      </button>

      {/* Terms Notice */}
      <p className="text-xs text-center text-slate-500">
        By creating an account, you agree to receive updates and promotional emails.
      </p>
    </form>
  );
}
