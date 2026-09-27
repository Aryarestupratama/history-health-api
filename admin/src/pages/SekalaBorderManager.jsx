import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PhonePreview from '../components/PhonePreview';

const EMPTY_FORM = {
  image_link: '',
  is_published: false,
};

// Aset Border SEKALA — singleton, pola sama WabahIntroManager (tidak ada
// list/table/dialog tambah-baru, cuma 1 form yang selalu ada, sesuai
// SekalaBorderController backend yang cuma punya show()/update()).
// BEDA dari WabahIntroManager saat ini: field-nya `image_link` (link Drive
// mentah), bukan `content` teks, karena border tetap berupa gambar yang
// dipasang ke foto profil user (bukan konten bacaan).
export default function SekalaBorderManager() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBorder();
  }, []);

  async function fetchBorder() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/sekala-border');
      setForm({
        image_link: res.data.image_link || '',
        is_published: !!res.data.is_published,
      });
      setImageUrl(res.data.image_url || null);
    } catch (err) {
      setError('Gagal memuat aset Border SEKALA.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await api.put('/admin/sekala-border', {
        image_link: form.image_link || null,
        is_published: form.is_published,
      });
      setForm({
        image_link: res.data.image_link || '',
        is_published: !!res.data.is_published,
      });
      setImageUrl(res.data.image_url || null);
      toast.success('Border SEKALA berhasil disimpan');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan Border SEKALA.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Border SEKALA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aset gambar border yang dipasang user ke foto profil setelah mengumpulkan
          semua badge studi kasus dari year yang published. Hanya ada satu border
          untuk seluruh aplikasi. Kapan border terbuka untuk user diatur otomatis
          oleh sistem (tidak diatur di sini) — halaman ini murni soal aset gambarnya.
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
          <form id="sekala-border-form" onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-5 w-full max-w-xl">
            <div className="space-y-1.5">
              <Label>Link Google Drive gambar border</Label>
              <Input
                value={form.image_link}
                onChange={(e) => setForm({ ...form, image_link: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Gunakan link "Share" Google Drive, sama seperti link foto vaksin/infografis lain.
              </p>
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
              Kalau belum dicentang, user yang sudah unlock pun tidak akan melihat
              border ini di aplikasi — aman untuk menyiapkan asetnya dulu sebelum tayang.
            </p>

            <div className="pt-2">
              <Button type="submit" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>

          {/* PhonePreview screen="sekala-border" -- perlu ditambahkan case
              baru di PhonePreview.jsx untuk render imageUrl sebagai border
              di atas avatar placeholder, sama pola dengan preview badge/
              vaccine yang sudah ada. */}
          <div className="flex flex-1 justify-center">
            <PhonePreview screen="sekala-border" data={{ imageUrl }} compact />
          </div>
        </div>
      )}
    </div>
  );
}