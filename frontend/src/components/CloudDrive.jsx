// src/components/CloudDrive.jsx
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { api, API_BASE } from "../services/api";

export default function CloudDrive() {
  const { token, user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Folder navigation state
  const [parentId, setParentId] = useState(null);
  const [pathHistory, setPathHistory] = useState([]); // Array of { id, name }

  // Action modals/states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploading, setUploading] = useState(false);

  // Move action states
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingItem, setMovingItem] = useState(null); // The item being moved
  const [destinationFolderId, setDestinationFolderId] = useState(""); // Selected folder ID
  const [allFolders, setAllFolders] = useState([]); // List of folders for the select dropdown

  // Fetch items inside folder
  const fetchItems = async (currentParentId) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/drive/list${currentParentId ? `?parent_id=${currentParentId}` : ""}`;
      const data = await api.get(url, { token });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load drive items:", err);
      setError(err.detail || "Failed to load files and folders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchItems(parentId);
    }
  }, [token, parentId]);

  // Navigate into a folder
  const handleOpenFolder = (folder) => {
    setPathHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setParentId(folder.id);
  };

  // Navigate using breadcrumbs
  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Clicked root
      setPathHistory([]);
      setParentId(null);
    } else {
      const newHistory = pathHistory.slice(0, index + 1);
      setPathHistory(newHistory);
      setParentId(pathHistory[index].id);
    }
  };

  // Create folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.post(
        "/api/drive/folders",
        { name: newFolderName.trim(), parent_id: parentId },
        { token }
      );
      setNewFolderName("");
      setShowFolderModal(false);
      fetchItems(parentId); // Refresh
    } catch (err) {
      alert(err.detail || "Failed to create folder");
    }
  };

  // Upload file
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (parentId) {
        formData.append("parent_id", parentId);
      }

      await api.post("/api/drive/upload", formData, { token });
      fetchItems(parentId); // Refresh
    } catch (err) {
      alert(err.detail || "Failed to upload file");
    } finally {
      setUploading(false);
      // Reset input value
      e.target.value = null;
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    if (!confirm("Are you sure you want to delete this item? Folders will be deleted recursively.")) return;

    try {
      await api.del(`/api/drive/items/${itemId}`, { token });
      fetchItems(parentId); // Refresh
    } catch (err) {
      alert(err.detail || "Failed to delete item");
    }
  };

  // Start Move Flow
  const handleStartMove = async (item) => {
    setMovingItem(item);
    setDestinationFolderId("");
    try {
      // Fetch list of folders for target destination dropdown
      const folders = await api.get("/api/drive/folders/all", { token });
      // Exclude the folder itself from the list to avoid cycle loops
      setAllFolders(folders.filter(f => f.id !== item.id));
      setShowMoveModal(true);
    } catch (err) {
      alert(err.detail || "Failed to load folders");
    }
  };

  // Execute Move API
  const handleExecuteMove = async (e) => {
    e.preventDefault();
    if (!movingItem) return;

    try {
      await api.post(
        "/api/drive/move",
        {
          item_id: movingItem.id,
          new_parent_id: destinationFolderId === "" ? null : parseInt(destinationFolderId)
        },
        { token }
      );
      setShowMoveModal(false);
      setMovingItem(null);
      fetchItems(parentId); // Refresh
    } catch (err) {
      alert(err.detail || "Failed to move item");
    }
  };

  // Helper formats
  const formatBytes = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return "📄";
    const type = fileType.toLowerCase();
    if (type.includes("pdf")) return "📕";
    if (type.includes("image")) return "🖼️";
    if (type.includes("word") || type.includes("officedocument.word")) return "📘";
    if (type.includes("presentation") || type.includes("powerpoint")) return "📙";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return "📦";
    return "📄";
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/50 rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📁</span> Cloud Storage
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Access files, shared course notes, and create personal folders
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white transition-all text-sm font-medium"
          >
            <span>📁</span> + New Folder
          </button>
          
          <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90 text-white cursor-pointer transition-opacity text-sm font-semibold shadow-lg shadow-indigo-500/10">
            <span>{uploading ? "⏳" : "📤"}</span>
            {uploading ? "Uploading..." : "Upload File"}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="flex items-center flex-wrap gap-2 text-sm text-slate-400 bg-slate-900/20 border border-slate-800/40 rounded-xl px-5 py-3">
        <button
          onClick={() => handleBreadcrumbClick(-1)}
          className="hover:text-sky-400 transition-colors font-medium flex items-center gap-1.5"
        >
          ☁️ Drive
        </button>
        {pathHistory.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <span className="text-slate-600">/</span>
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`hover:text-sky-400 transition-colors ${
                index === pathHistory.length - 1 ? "text-white font-medium pointer-events-none" : ""
              }`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Drive Items List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/20 border border-slate-800/30 rounded-2xl">
          <div className="w-10 h-10 border-3 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Loading storage items...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/5 border border-red-500/10 p-12 text-center">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchItems(parentId)}
            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-slate-800/30 rounded-2xl text-center">
          <span className="text-5xl mb-4 block">📁</span>
          <h3 className="font-semibold text-slate-300 text-base">This folder is empty</h3>
          <p className="text-slate-500 text-xs mt-1">Upload a file or create a folder to get started</p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-800/50 rounded-2xl bg-slate-900/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Uploaded By</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Date Added</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-slate-900/10">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-900/30 transition-colors text-sm text-slate-300 group"
                >
                  {/* Name column */}
                  <td className="px-6 py-4 font-medium text-white">
                    {item.is_folder ? (
                      <button
                        onClick={() => handleOpenFolder(item)}
                        className="flex items-center gap-3 hover:text-sky-400 transition-colors text-left"
                      >
                        <span className="text-xl">📁</span>
                        <span>{item.name}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getFileIcon(item.file_type)}</span>
                        <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">{item.name}</span>
                      </div>
                    )}
                  </td>

                  {/* Uploaded By */}
                  <td className="px-6 py-4 text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase">
                        {item.uploader_name?.charAt(0) || "U"}
                      </span>
                      <span>{item.uploader_name}</span>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="px-6 py-4 text-slate-400">
                    {item.is_folder ? "—" : formatBytes(item.file_size)}
                  </td>

                  {/* Date Added */}
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!item.is_folder && item.file_url && (
                        <a
                          href={`${API_BASE}${item.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 transition-colors"
                          title="Download"
                        >
                          📥
                        </a>
                      )}
                      {/* Check if not a default course folder, as course folders shouldn't be deleted or moved */}
                      {item.course_id === null && (user?.role === "teacher" || item.uploader_id === user?.id) && (
                        <>
                          <button
                            onClick={() => handleStartMove(item)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                            title="Move Item"
                          >
                            🚚
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            onClick={() => setShowFolderModal(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white mb-4">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Exams"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Item Modal */}
      {showMoveModal && movingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            onClick={() => setShowMoveModal(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-white mb-2">Move Item</h3>
            <p className="text-xs text-slate-400 mb-4">
              Choose a new destination folder for <span className="text-sky-400 font-semibold">"{movingItem.name}"</span>
            </p>

            <form onSubmit={handleExecuteMove} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Destination Folder
                </label>
                <select
                  value={destinationFolderId}
                  onChange={(e) => setDestinationFolderId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 transition-all appearance-none"
                >
                  <option value="">☁️ Root Drive</option>
                  {allFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      📁 {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Confirm Move
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
