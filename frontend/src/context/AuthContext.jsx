import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('configflow_token'));
  const [email, setEmail] = useState(() => localStorage.getItem('configflow_email'));

  const login = useCallback(async (emailInput, password) => {
    const res = await api.post('/admin/auth/login', { email: emailInput, password });
    const { token: newToken, email: userEmail } = res.data.data;
    localStorage.setItem('configflow_token', newToken);
    localStorage.setItem('configflow_email', userEmail);
    setToken(newToken);
    setEmail(userEmail);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('configflow_token');
    localStorage.removeItem('configflow_email');
    setToken(null);
    setEmail(null);
  }, []);

  return <AuthContext.Provider value={{ token, email, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
