import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { TOKEN_STORAGE_KEY } from '../services/api.ts';
import { AuthUser } from '../types/index.ts';

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  passwordNoticeDismissed: boolean;
  dismissPasswordNotice: () => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserState: (updated: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [passwordNoticeDismissed, setPasswordNoticeDismissed] = useState<boolean>(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setPasswordNoticeDismissed(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      clearSession();
      setLoading(false);
      return;
    }

    try {
      const response = await api.get<{ success: boolean; user: AuthUser }>('/auth/me');
      setUser(response.data.user);
      setToken(stored);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
    };
    window.addEventListener('attendcloud:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('attendcloud:unauthorized', handleUnauthorized);
    };
  }, [clearSession]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const response = await api.post<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>('/auth/login', { email, password });

    localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    setPasswordNoticeDismissed(false);
    return response.data.user;
  };

  const register = async (payload: RegisterPayload): Promise<AuthUser> => {
    const response = await api.post<{
      success: boolean;
      token: string;
      user: AuthUser;
    }>('/auth/register', payload);

    localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    setPasswordNoticeDismissed(false);
    return response.data.user;
  };

  const logout = async () => {
    try {
      if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
        await api.post('/auth/logout');
      }
    } catch {
      // Proceed with local session termination regardless
    } finally {
      clearSession();
    }
  };

  const updateUserState = (updated: AuthUser) => {
    setUser(updated);
  };

  const dismissPasswordNotice = () => {
    setPasswordNoticeDismissed(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        passwordNoticeDismissed,
        dismissPasswordNotice,
        login,
        register,
        logout,
        refreshUser,
        updateUserState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
