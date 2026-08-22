import { Link } from 'react-router-dom';
import { Landmark, FileStack, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SHORTCUTS = [
  {
    to: '/eras',
    icon: Landmark,
    title: 'Kelola Era & Tahun',
    description: 'Atur 3 masa (Kolonial, Kemerdekaan, Modern) dan tahun-tahun wabah di dalamnya.',
  },
  {
    to: '/sections',
    icon: FileStack,
    title: 'Kelola Section',
    description: 'Susun informasi sejarah per tahun: blok konten, urutan, dan link kuis.',
  },
  {
    to: '/figures',
    icon: Users,
    title: 'Kelola Tokoh',
    description: 'Data tokoh sejarah untuk collectible card di aplikasi mobile.',
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
        {SHORTCUTS.map(({ to, icon: Icon, title, description }) => (
          <Link key={to} to={to}>
            <Card className="group h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
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
