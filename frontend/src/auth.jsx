import { createContext, useContext, useEffect, useState } from "react";
import { loginUser, registerUser, logout as logoutRequest, refreshSession } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ["token", "accessToken", "refreshToken", "user"].forEach((key) => localStorage.removeItem(key));
    refreshSession().then((savedUser) => {
      setUser(savedUser);
      setLoading(false);
    });
  }, []);

  async function login(loginValue, password) {
    setUser(await loginUser(loginValue, password));
  }

  async function register(data) {
    setUser(await registerUser(data));
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
