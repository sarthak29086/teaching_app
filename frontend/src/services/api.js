// src/services/api.js
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let finalBody;
  if (body instanceof FormData) {
    finalBody = body;
    // Don't set Content-Type; browser does it for FormData
  } else {
    headers["Content-Type"] = "application/json";
    finalBody = body ? JSON.stringify(body) : undefined;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: finalBody,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!res.ok) {
    const err = (data && data.detail) ? data : { detail: data || "Request failed" };
    throw err;
  }
  return data;
}

export const api = {
  get: (path, opts = {}) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts = {}) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts = {}) => request(path, { ...opts, method: "PUT", body }),
  del: (path, opts = {}) => request(path, { ...opts, method: "DELETE" }),
};
