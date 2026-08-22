import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EraYearManager from './pages/EraYearManager';
import SectionManager from './pages/SectionManager';
import SectionEditor from './pages/SectionEditor';
import FigureManager from './pages/FigureManager';

function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div>
      <nav style={{ padding: 12, borderBottom: '1px solid #ccc', display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/eras">Kelola Era & Tahun</Link>
        <Link to="/sections">Kelola Section</Link>
        <Link to="/figures">Kelola Tokoh</Link>
        <span style={{ marginLeft: 'auto' }}>{user?.name}</span>
        <button onClick={logout}>Logout</button>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/eras"
            element={
              <ProtectedRoute>
                <Layout><EraYearManager /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sections"
            element={
              <ProtectedRoute>
                <Layout><SectionManager /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sections/:sectionId"
            element={
              <ProtectedRoute>
                <Layout><SectionEditor /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/figures"
            element={
              <ProtectedRoute>
                <Layout><FigureManager /></Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}