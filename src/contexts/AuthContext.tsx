import React, { createContext, useContext, useState } from "react";

interface User {
  name: string;
  role: string;
  email: string;
  sector: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, _password: string) => {
    if (username && _password) {
      setUser({
        name: "Mario Cabral",
        role: "Analista de Processos",
        email: "mario.cabral@fgh.org.br",
        sector: "Processos e Qualidade",
        initials: "MC",
      });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
