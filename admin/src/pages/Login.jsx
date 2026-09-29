import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Field, InlineError, PasswordInput, primaryButtonClass } from '@/components/page-kit';
import { APP_NAME, APP_FULL_NAME } from '@/config/branding';

// REDESIGN: disamakan dengan kit halaman admin (`@/components/page-kit`):
// field pakai <Field>, password pakai <PasswordInput>, error pakai
// <InlineError>, tombol pakai `primaryButtonClass` (gamify). Sebelumnya
// halaman ini punya toggle password buatan sendiri dan tombol `primary`
// default, beda dari halaman admin lain. Logic login TIDAK berubah.
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Login berhasil');
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Login gagal. Periksa email/password.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gamify/10 via-secondary/40 to-secondary/40 px-4 py-8">
      {/* Animasi masuk pakai tailwindcss-animate (sudah terpasang di
          tailwind.config.js): fade + geser tipis dari bawah. */}
      <Card className="w-full max-w-sm overflow-hidden rounded-2xl py-0 shadow-lg duration-500 animate-in fade-in slide-in-from-bottom-3">
        {/* Gambar utuh, tanpa crop — tinggi menyesuaikan rasio aslinya */}
        <img
          src={`${import.meta.env.BASE_URL}images/login-illustration.png`}
          alt=""
          aria-hidden="true"
          className="w-full"
        />

        <CardContent className="px-6 pb-7 pt-2">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={`${import.meta.env.BASE_URL}icons/app-icon.png`}
              alt={APP_NAME}
              className="mb-3 h-14 w-14 rounded-2xl object-cover shadow-sm"
            />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {APP_NAME} Admin
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{APP_FULL_NAME}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field id="email" label="Email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-11"
              />
            </Field>

            <Field id="password" label="Password">
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </Field>

            {error && <InlineError message={error} />}

            <Button
              type="submit"
              disabled={submitting}
              className={cn('h-11 w-full text-sm font-semibold', primaryButtonClass)}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}