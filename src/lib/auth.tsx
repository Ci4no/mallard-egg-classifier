import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("me")
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);
  const authenticate = async (route: string, payload: object) => {
    const r = await api<{ token: string; user: User }>(route, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(r.token);
    setUser(r.user);
  };
  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: (email, password) => authenticate("login", { email, password }),
      setup: (name, email, password) => authenticate("setup", { name, email, password }),
      logout: async () => {
        try {
          await api("logout", { method: "POST" });
        } finally {
          setToken(null);
          setUser(null);
        }
      },
    }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("AuthProvider missing");
  return v;
}
