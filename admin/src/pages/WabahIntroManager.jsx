import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PhonePreview from '../components/PhonePreview';

const EMPTY_FORM = {
  content: '',
  is_published: false,
};

// Konten singleton "Apa itu Wabah" — beda dari VaccineManager (tidak ada
// list/table/dialog tambah-baru, cuma 1 form yang selalu ada, sesuai
// WabahIntroController backend yang cuma punya show()/update()).
export default function WabahIntroManager() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIntro();
  }, []);

  async function fetchIntro() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/wabah-intro');
      setForm({
        content: res.data.content || '',
        is_published: !!res.data.is_published,
      });
    } catch (err) {
      setError('Gagal memuat konten pengenalan wabah.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.put('/admin/wabah-intro', {
        content: form.content || null,
        is_published: form.is_published,
      });
      setForm({
        content: res.data.content || '',
        is_published: !!res.data.is_published,
      });
      toast.success('Konten berhasil disimpan');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan konten pengenalan wabah.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengenalan Wabah</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konten "Apa itu Wabah" — hanya bisa diakses lewat ikon info di header roadmap era
          pada tab Informasi Sejarah (tidak ada tampilan otomatis). Hanya ada satu konten
          untuk seluruh aplikasi, berupa teks penjelasan biasa.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <form id="wabah-intro-form" onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-5 w-full max-w-xl">
            <div className="space-y-1.5">
              <Label>Teks penjelasan "Apa itu Wabah"</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Tuliskan penjelasan tentang apa itu wabah..."
                rows={8}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Publish (tampil ke user)
            </label>
            <p className="text-xs text-muted-foreground">
              Kalau belum dicentang, user tidak akan melihat modal ini sama sekali — aman untuk
              menyiapkan konten dulu sebelum tayang.
            </p>

            <div className="pt-2">
              <Button type="submit" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>

          {/* PhonePreview screen="wabah-intro" -- sekarang render teks
              (content), bukan lagi resolvedImageUrl. Kalau PhonePreview.jsx
              di project Anda masih membaca resolvedImageUrl untuk screen
              ini, sesuaikan case-nya di sana untuk menampilkan `content`
              sebagai paragraf teks, bukan <img>. */}
          <div className="flex flex-1 justify-center">
            <PhonePreview screen="wabah-intro" data={{ content: form.content }} compact />
          </div>
        </div>
      )}
    </div>
  );
}