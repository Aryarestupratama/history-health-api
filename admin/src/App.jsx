import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Layers, Syringe, ShieldCheck, Settings, LogOut, BookOpenText, UserCog, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { APP_NAME } from '@/config/branding';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EraYearManager from './pages/EraYearManager';
import VaccineManager from './pages/VaccineManager';
import AdminManager from './pages/AdminManager';
import StudioEraYearPicker from './pages/StudioEraYearPicker';
import WabahWorkspace from './pages/WabahWorkspace';
import WabahIntroManager from './pages/WabahIntroManager';
import SekalaBorderManager from './pages/SekalaBorderManager';
import AdminProfile from './pages/AdminProfile';

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

const SECONDARY_NAV_ITEMS = [
  { to: '/eras', label: 'Era & Tahun', icon: Settings },
  { to: '/wabah-intro', label: 'Pengenalan Wabah', icon: BookOpenText },
  // Aset Border SEKALA (baru) -- housekeeping sekunder juga, pola sama
  // Pengenalan Wabah (singleton, jarang diubah setelah aset final siap).
  { to: '/sekala-border', label: 'Border SEKALA', icon: Sparkles },
  // Profil (baru) -- satu-satunya tempat admin ganti password akun sendiri,
  // sejak fitur Edit di Kelola Admin dicabut total.
  { to: '/profile', label: 'Profil Saya', icon: UserCog },
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

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + '/');

  function handleLogout() {
    toast.success('Logout berhasil');
    logout();
  }

  return (
    <div className="flex min-h-screen w-full bg-secondary/40">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r bg-background shadow-sm">
        {/* REDESIGN: logo sebelumnya 128x128px (h-32 w-32) -- hampir
            memenuhi lebar sidebar (240px) dan mendorong seluruh menu turun.
            Diperkecil jadi ukuran wajar untuk header sidebar + nama app di
            sampingnya, pola umum admin panel. */}
        <div className="flex items-center gap-2.5 border-b px-4 py-4">
          <img
            src={`${import.meta.env.BASE_URL}icons/app-icon.png`}
            alt={APP_NAME}
            className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-sm"
          />
          <span className="truncate text-sm font-bold tracking-tight text-foreground">
            {APP_NAME}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive(to)
                  ? 'bg-gamify text-gamify-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span
                className={cn(
                  'absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gamify transition-opacity duration-150',
                  isActive(to) ? 'opacity-100' : 'opacity-0'
                )}
              />
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}

          <div className="my-3 border-t pt-3">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Housekeeping
            </p>
            {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150',
                  isActive(to)
                    ? 'bg-gamify/10 text-gamify shadow-sm'
                    : 'text-muted-foreground/70 hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent">
            <Link to="/profile" className="flex min-w-0 flex-1 items-center gap-2" title="Buka Profil">
              {/* REDESIGN: avatar sebelumnya pakai token `warning` (satu-
                  satunya elemen di sidebar yang tidak pakai `gamify`,
                  warna aksen utama nav). Disamakan ke `gamify` supaya
                  identitas warna sidebar konsisten. */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gamify/15 text-xs font-semibold text-gamify">
                {initials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground leading-tight">Admin</p>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
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

          {/* Konten singleton "Apa itu Wabah" — housekeeping sekunder juga,
              biasanya diisi sekali lalu jarang diubah. */}
          <Route
            path="/wabah-intro"
            element={
              <ProtectedRoute>
                <Layout><WabahIntroManager /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Aset Border SEKALA (baru) — housekeeping sekunder, singleton
              sama pola wabah-intro, biasanya diisi sekali oleh tim desain
              lalu jarang diubah. */}
          <Route
            path="/sekala-border"
            element={
              <ProtectedRoute>
                <Layout><SekalaBorderManager /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Profil (baru) -- ganti password akun sendiri, pengganti fitur
              Edit yang sudah dicabut dari Kelola Admin. */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout><AdminProfile /></Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
      {/* Sekali di root -- semua pemanggilan toast.success()/toast.error()
          di halaman mana pun akan tampil lewat instance ini. */}
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
}