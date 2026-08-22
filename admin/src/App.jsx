import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Landmark, FileStack, Users, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EraYearManager from './pages/EraYearManager';
import SectionManager from './pages/SectionManager';
import SectionEditor from './pages/SectionEditor';
import FigureManager from './pages/FigureManager';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/eras', label: 'Era & Tahun', icon: Landmark },
  { to: '/sections', label: 'Section', icon: FileStack },
  { to: '/figures', label: 'Tokoh', icon: Users },
];

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-secondary/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r bg-background">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            HK
          </div>
          <span className="text-sm font-semibold tracking-tight">Sejarah Kesehatan</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground leading-tight">Admin</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col pl-60">
        <main className="flex-1 p-6 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
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
