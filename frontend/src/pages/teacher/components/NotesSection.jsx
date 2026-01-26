// src/pages/teacher/components/NotesSection.jsx
import FileItem from "./FileItem";

export default function NotesSection({ section, updateSection }) {
  const updateNotes = (value) => {
    updateSection({ ...section, notes: value });
  };

  const addFiles = (files) => {
    updateSection({
      ...section,
      files: [...section.files, ...Array.from(files)],
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <h3 className="text-lg font-semibold">{section.title}</h3>

      {/* Text notes */}
      <textarea
        placeholder="Write notes here..."
        value={section.notes}
        onChange={(e) => updateNotes(e.target.value)}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 p-3 text-sm min-h-[100px]"
      />

      {/* File upload */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">
          Upload files
        </label>
        <input
          type="file"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="text-sm text-slate-300"
        />
      </div>

      {/* Files list */}
      {section.files.length > 0 && (
        <div className="space-y-2">
          {section.files.map((file, idx) => (
            <FileItem key={idx} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
