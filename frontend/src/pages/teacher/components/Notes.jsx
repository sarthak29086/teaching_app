// src/pages/teacher/components/Notes.jsx
import { useState } from "react";
import NotesSection from "./NotesSection";

export default function Notes() {
  const [sections, setSections] = useState([]);
  const [title, setTitle] = useState("");

  const addSection = () => {
    if (!title.trim()) return;
    setSections((prev) => [
      ...prev,
      {
        id: Date.now(),
        title,
        notes: "",
        files: [],
      },
    ]);
    setTitle("");
  };

  return (
    <div className="space-y-6">
      {/* Add section */}
      <div className="rounded-xl bg-slate-900 p-4 border border-slate-800">
        <h3 className="text-sm font-medium mb-2">Add Section</h3>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Section title (e.g. Week 1)"
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
          />
          <button
            onClick={addSection}
            className="bg-emerald-500 text-black px-4 rounded-lg text-sm"
          >
            Add
          </button>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <NotesSection
          key={section.id}
          section={section}
          updateSection={(updated) =>
            setSections((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            )
          }
        />
      ))}
    </div>
  );
}
