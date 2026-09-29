import { Link } from 'react-router-dom';
import { Landmark, Layers, ShieldCheck, Syringe, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

// Sapaan sesuai jam -- ambang waktu disamakan dengan HomeScreen di app mobile.
function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero sapaan. Animasi masuk pakai tailwindcss-animate (sudah
          terpasang di tailwind.config.js). */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-gamify/15 via-background to-background p-6 duration-500 animate-in fade-in slide-in-from-bottom-2 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gamify/10 blur-2xl" />
        <p className="text-sm font-medium text-muted-foreground">{greeting()} 👋</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{user?.name}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Selamat datang di panel admin. Pilih menu di bawah untuk mulai mengelola konten.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Menu cepat
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map(({ to, icon: Icon, title, description, accent }, index) => (
            <Link
              key={to}
              to={to}
              // Muncul berurutan (stagger) -- fillMode 'backwards' supaya
              // kartu tetap tersembunyi selama menunggu delay-nya.
              style={{ animationDelay: `${120 + index * 70}ms`, animationFillMode: 'backwards' }}
              className="block rounded-xl duration-500 animate-in fade-in slide-in-from-bottom-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="group h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {title}
                    <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}