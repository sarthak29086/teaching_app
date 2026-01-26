// src/pages/teacher/components/Announcements.jsx
import { useState } from "react";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [text, setText] = useState("");

  const post = () => {
    if (!text.trim()) return;
    setAnnouncements((prev) => [
      {
        id: Date.now(),
        text,
        createdAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    setText("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-900 p-4 border border-slate-800">
        <textarea
          placeholder="Post an announcement to students..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm"
        />
        <button
          onClick={post}
          className="mt-2 bg-emerald-500 text-black px-4 py-2 rounded-lg text-sm"
        >
          Post
        </button>
      </div>

      {announcements.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <p className="text-sm">{a.text}</p>
          <span className="text-xs text-slate-400">
            {a.createdAt}
          </span>
        </div>
      ))}
    </div>
  );
}
