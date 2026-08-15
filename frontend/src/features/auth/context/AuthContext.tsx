import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../../../types';
import { authService } from '../services/authService';
import type { LoginCredentials, SignupData } from '../services/authService';



interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Rehydrate user state on app initialization
    const rehydrateSession = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await authService.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            if (res.accessToken) {
              setToken(res.accessToken);
              localStorage.setItem('accessToken', res.accessToken);
            }
          }
        } catch (err) {
          console.warn('Session expired on boot:', err);
          localStorage.removeItem('accessToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    rehydrateSession();
  }, []);


  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.user && response.accessToken) {
        setUser(response.user);
        setToken(response.accessToken);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    setIsLoading(true);
    try {
      await authService.signup(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
