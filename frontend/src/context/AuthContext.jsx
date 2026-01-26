// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react";
import { api } from "../services/api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      localStorage.removeItem("token");
      return;
    }
    // fetch /api/me
    setLoading(true);
    api.get("/api/me", { token })
      .then((u) => setUser(u))
      .catch(() => {
        setToken(null);
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
