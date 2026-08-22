import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    const token = localStorage.getItem('admin_token');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    // Backend: POST /api/auth/login (sudah ada di AuthController, progress.md)
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;

    // Cek role admin (R-ADMIN-02) — meski backend juga memproteksi via middleware,
    // kita cek di sini supaya user non-admin tidak "berhasil login" ke panel admin
    if (user.role !== 'admin') {
      throw new Error('Akun ini tidak memiliki akses admin.');
    }

    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  function logout() {
    api.post('/auth/logout').finally(() => {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setUser(null);
    });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
