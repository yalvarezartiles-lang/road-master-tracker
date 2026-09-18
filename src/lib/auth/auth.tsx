import * as React from "react";

/**
 * Sistema de autenticación cerrado (mock auth).
 * No hay registro: sólo credenciales fijas para el profesor.
 */
const VALID_USER = "admin";
const VALID_PASSWORD = "adassa2026";
const STORAGE_KEY = "adassa.auth";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (user: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  // Restaura la sesión guardada en el navegador (persistencia entre recargas).
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setIsAuthenticated(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const login = React.useCallback((user: string, password: string) => {
    const ok = user.trim() === VALID_USER && password === VALID_PASSWORD;
    if (ok) {
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    }
    return ok;
  }, []);

  const logout = React.useCallback(() => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = React.useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
