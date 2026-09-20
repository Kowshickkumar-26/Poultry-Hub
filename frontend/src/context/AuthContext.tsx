import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import type { User, LoginRequest, RegisterRequest, AuthResponse } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUser(): User | null {
  try {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      return JSON.parse(storedUser);
    }
  } catch {
    // Fallback if parsing fails
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [isLoading] = useState(false);

  function persistSession(data: AuthResponse) {
    const loggedInUser: User = {
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
    };
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  async function login(credentials: LoginRequest) {
    const response = await api.post<AuthResponse>("/api/auth/login", credentials);
    persistSession(response.data);
  }

  async function register(data: RegisterRequest) {
    const response = await api.post<AuthResponse>("/api/auth/register", data);
    persistSession(response.data);
  }

  function updateUser(updatedData: Partial<User>) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
