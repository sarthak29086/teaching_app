// src/components/auth/Login.jsx
import React, { useState, useContext } from "react";
import { api } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setOtpRequested(false);
    setOtpCode("");
    setDevOtp(null);
    setPassword("");
  }

  async function submitPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api.post("/api/auth/login", { email, password });
      if (data?.access_token) {
        login(data.access_token);
        navigate("/logic");
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      setError(err.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDevOtp(null);

    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setOtpRequested(true);
      setSuccess("Check your email for the OTP code");
      if (res?.dev_otp) setDevOtp(res.dev_otp);
    } catch (err) {
      setError(err.detail || "Could not request OTP");
    } finally {
      setLoading(false);
    }
  }

  async function submitOtpLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.post("/api/auth/otp-login", { email, code: otpCode });
      if (data?.access_token) {
        login(data.access_token);
        navigate("/logic");
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      setError(err.detail || "OTP login failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyles = "w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 transition-all";

  return (
    <div className="space-y-5">
      {/* Mode Switcher */}
      <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/30">
        <button
          type="button"
          onClick={() => switchMode("password")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "password"
              ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
            }`}
        >
          🔐 Password
        </button>
        <button
          type="button"
          onClick={() => switchMode("otp")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "otp"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
              : "text-slate-400 hover:text-white"
            }`}
        >
          ✉️ Email OTP
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={submitPassword} className="space-y-4">
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => switchMode("otp")}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              className={inputStyles}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              <>Sign in →</>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={otpRequested ? submitOtpLogin : requestOtp} className="space-y-4">
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
              disabled={otpRequested}
            />
          </div>

          {otpRequested && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Enter OTP Code
              </label>
              <input
                type="text"
                className={`${inputStyles} text-center tracking-[0.5em] text-lg font-mono`}
                placeholder="0000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.slice(0, 4))}
                maxLength={4}
                autoFocus
              />
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-300 flex items-center gap-2">
                <span>✅</span> {success}
              </p>
              {devOtp && (
                <p className="text-xs text-emerald-400/70 mt-1">
                  Dev OTP: <code className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded">{devOtp}</code>
                </p>
              )}
            </div>
          )}

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
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : otpRequested ? (
              <>Verify & Sign in →</>
            ) : (
              <>Send OTP →</>
            )}
          </button>

          <button
            type="button"
            onClick={() => switchMode("password")}
            className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Back to password login
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-slate-900 text-xs text-slate-500">or continue with</span>
        </div>
      </div>

      {/* Social Login (Demo) */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all">
          <span>🔵</span> Google
        </button>
        <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all">
          <span>⚫</span> GitHub
        </button>
      </div>
    </div>
  );
}
