import { Link } from 'react-router-dom';
import { Landmark, Layers, ShieldCheck, Syringe, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// Route disamakan dengan App.jsx (Design.md §4): /sections & /quizzes lama
// sudah digantikan /studio (Content Studio, 3 tab). Warna dibedakan per
// shortcut sesuai domainnya -- bukan abu-abu semua -- supaya Dashboard
// langsung terasa "berwarna" seperti mockup, tapi tetap selektif per §5.6.
const SHORTCUTS = [
  {
    to: '/studio',
    icon: Layers,
    title: 'Content Studio',
    description: 'Susun 1 wabah lengkap: section & blok, rangkuman, vaksin terkait, dan kuis dalam 1 alur.',
    accent: 'bg-warning/10 text-warning',
  },
  {
    to: '/vaccines',
    icon: Syringe,
    title: 'Kelola Vaksin',
    description: 'Data master vaksin untuk collectible card di aplikasi mobile.',
    accent: 'bg-gamify/10 text-gamify',
  },
  {
    to: '/admins',
    icon: ShieldCheck,
    title: 'Kelola Admin',
    description: 'Tambah atau kelola akun admin lain (akses setara, tanpa sub-level).',
    accent: 'bg-info/10 text-info',
  },
  {
    to: '/eras',
    icon: Landmark,
    title: 'Kelola Era & Tahun',
    description: 'Housekeeping: atur 3 masa (Kolonial, Kemerdekaan, Modern) dan tahun-tahun wabah.',
    accent: 'bg-secondary text-foreground',
  },
];

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Halo, {user?.name} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selamat datang di panel admin. Pilih menu di bawah untuk mulai mengelola konten.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map(({ to, icon: Icon, title, description, accent }) => (
          <Link key={to} to={to}>
            <Card className="group h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}