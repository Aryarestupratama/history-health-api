import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { APP_NAME, APP_FULL_NAME } from '@/config/branding';

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
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <Card className="w-full max-w-sm overflow-hidden py-0">
        {/* Gambar utuh, tanpa crop — tinggi menyesuaikan rasio aslinya */}
        <img
          src={`${import.meta.env.BASE_URL}images/login-illustration.png`}
          alt=""
          aria-hidden="true"
          className="w-full"
        />

        <CardContent className="px-6 pb-6 pt-2">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={`${import.meta.env.BASE_URL}icons/app-icon.png`}
              alt={APP_NAME}
              className="mb-3 h-14 w-14 rounded-2xl object-cover shadow-sm"
            />
            <h1 className="text-xl font-semibold text-foreground">{APP_NAME} Admin</h1>
            <p className="text-sm text-muted-foreground">{APP_FULL_NAME}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Memproses...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}