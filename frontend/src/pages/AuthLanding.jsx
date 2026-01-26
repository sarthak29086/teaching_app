// src/pages/AuthLanding.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Login from "../components/auth/Login";
import Register from "../components/auth/Register";

export default function AuthLanding() {
  const [activeTab, setActiveTab] = useState("login");

  const features = [
    { icon: "📚", title: "Course Management", desc: "Create and organize courses with ease" },
    { icon: "🎥", title: "Live Classes", desc: "Host interactive video sessions" },
    { icon: "📝", title: "Assignments", desc: "Create, submit, and grade work" },
    { icon: "📊", title: "Analytics", desc: "Track student progress in real-time" },
  ];

  const stats = [
    { value: "10K+", label: "Active Students" },
    { value: "500+", label: "Courses" },
    { value: "98%", label: "Satisfaction" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-gradient-to-r from-violet-500/10 to-transparent rounded-full blur-3xl" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Hero Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-xs font-medium text-sky-400">Now with AI-powered features</span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  The modern{" "}
                  <span className="relative">
                    <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                      teaching platform
                    </span>
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M1 5.5C47 2 87 2 101 5.5C115 9 155 7 199 3" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="200" y2="0">
                          <stop stopColor="#38bdf8" />
                          <stop offset="0.5" stopColor="#818cf8" />
                          <stop offset="1" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  {" "}for educators
                </h1>
                <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                  One unified workspace for teachers and students. Manage courses,
                  host live classes, track progress, and automate your teaching workflow.
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 pt-4">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                {features.map((feature, i) => (
                  <div
                    key={i}
                    className="group p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-900/70 transition-all cursor-default"
                  >
                    <span className="text-2xl mb-2 block">{feature.icon}</span>
                    <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {["🧑‍🏫", "👨‍🎓", "👩‍💼", "🧑‍💻"].map((emoji, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-sm"
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Join <span className="text-slate-300 font-medium">2,500+</span> educators worldwide
                </p>
              </div>
            </div>

            {/* Right Side - Auth Cards */}
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />

              {/* Auth Card */}
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800/50 shadow-2xl overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex border-b border-slate-800/50">
                  <button
                    onClick={() => setActiveTab("login")}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${activeTab === "login"
                        ? "text-white"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    <span className="relative z-10">Sign In</span>
                    {activeTab === "login" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 to-indigo-500" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${activeTab === "register"
                        ? "text-white"
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    <span className="relative z-10">Create Account</span>
                    {activeTab === "register" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-sky-500" />
                    )}
                  </button>
                </div>

                {/* Form Content */}
                <div className="p-6 sm:p-8">
                  {activeTab === "login" ? (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
                        <p className="text-sm text-slate-400">
                          Sign in to access your dashboard and classes
                        </p>
                      </div>
                      <Login />
                    </div>
                  ) : (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-1">Get started free</h2>
                        <p className="text-sm text-slate-400">
                          Create your account and start teaching today
                        </p>
                      </div>
                      <Register />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-slate-900/50 border-t border-slate-800/50">
                  <p className="text-xs text-center text-slate-500">
                    By continuing, you agree to our{" "}
                    <span className="text-slate-400 hover:text-white cursor-pointer">Terms</span>
                    {" "}and{" "}
                    <span className="text-slate-400 hover:text-white cursor-pointer">Privacy Policy</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Floating Cards */}
        <div className="relative max-w-7xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🚀", title: "Quick Setup", desc: "Get started in under 5 minutes", gradient: "from-violet-500/20 to-purple-500/20" },
              { icon: "🔒", title: "Secure & Private", desc: "Your data is encrypted and safe", gradient: "from-sky-500/20 to-blue-500/20" },
              { icon: "⚡", title: "Lightning Fast", desc: "Optimized for the best experience", gradient: "from-amber-500/20 to-orange-500/20" },
            ].map((card, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl bg-gradient-to-br ${card.gradient} border border-slate-800/50 hover:scale-[1.02] transition-transform cursor-default`}
              >
                <span className="text-3xl mb-4 block">{card.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-400">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
