import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Layers, Syringe, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { APP_NAME, APP_SHORT_INITIALS } from '@/config/branding';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EraYearManager from './pages/EraYearManager';
import VaccineManager from './pages/VaccineManager';
import AdminManager from './pages/AdminManager';
import StudioEraYearPicker from './pages/StudioEraYearPicker';
import WabahWorkspace from './pages/WabahWorkspace';

// Revisi Design.md §4: sidebar utama jadi Dashboard / Content Studio / Kelola
// Vaksin. "Era & Tahun" turun jadi housekeeping sekunder (jarang dipakai),
// dipisah dari nav utama. Menggantikan menu lama Section/Kuis yang sekarang
// jadi 3 tab di dalam Content Studio (WabahWorkspace).
// Kelola Admin ditambahkan (sesi ini) -- akses seluruh admin (R-ADMIN-01),
// jadi tetap di nav utama, bukan housekeeping.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/studio', label: 'Content Studio', icon: Layers },
  { to: '/vaccines', label: 'Kelola Vaksin', icon: Syringe },
  { to: '/admins', label: 'Kelola Admin', icon: ShieldCheck },
];

const SECONDARY_NAV_ITEMS = [{ to: '/eras', label: 'Era & Tahun', icon: Settings }];

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

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <div className="flex min-h-screen w-full bg-secondary/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r bg-background">
        <div className="flex h-14 items-center gap-2 border-b px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {APP_SHORT_INITIALS}
          </div>
          <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}

          <div className="my-2 border-t pt-2">
            {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  isActive(to)
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground/70 hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </div>
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

          {/* Content Studio: Pilih Era/Tahun -> Workspace Wabah (3 tab).
              Menggantikan route lama /sections, /sections/workspace/:yearId,
              dan /quizzes (Design.md §4). */}
          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <Layout><StudioEraYearPicker /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/studio/:yearId"
            element={
              <ProtectedRoute>
                <Layout><WabahWorkspace /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vaccines"
            element={
              <ProtectedRoute>
                <Layout><VaccineManager /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Kelola Admin (baru) -- CRUD akun admin (R-ADMIN-01/02). */}
          <Route
            path="/admins"
            element={
              <ProtectedRoute>
                <Layout><AdminManager /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Housekeeping sekunder, jarang dipakai (Architecture.md §4.5) */}
          <Route
            path="/eras"
            element={
              <ProtectedRoute>
                <Layout><EraYearManager /></Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}