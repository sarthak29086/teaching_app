// src/pages/teacher/components/FileItem.jsx
export default function FileItem({ file }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 border border-slate-700">
      <div className="text-sm truncate">{file.name}</div>
      <div className="text-xs text-slate-400">
        {(file.size / 1024).toFixed(1)} KB
      </div>
    </div>
  );
}
