import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Sama helper dengan VaccineManager.jsx — versi ringan
// LinkParserService::toDriveImageUrl (backend) untuk preview live di sisi
// klien tanpa round-trip API. Format 'thumbnail' harus tetap disamakan
// dengan backend (Design.md §4.3).
function resolveDrivePhotoUrl(rawUrl) {
  if (!rawUrl) return null;
  const patterns = [/\/d\/([a-zA-Z0-9_-]{10,})/, /[?&]id=([a-zA-Z0-9_-]{10,})/];
  for (const pattern of patterns) {
    const match = rawUrl.match(pattern);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }
  return null;
}

const EMPTY_FORM = {
  image_link: '',
  caption: '',
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
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchIntro();
  }, []);

  async function fetchIntro() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/wabah-intro');
      setForm({
        image_link: res.data.image_link || '',
        caption: res.data.caption || '',
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
    setSuccess(false);
    setSaving(true);
    try {
      const res = await api.put('/admin/wabah-intro', {
        image_link: form.image_link || null,
        caption: form.caption || null,
        is_published: form.is_published,
      });
      setForm({
        image_link: res.data.image_link || '',
        caption: res.data.caption || '',
        is_published: !!res.data.is_published,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan konten pengenalan wabah.');
    } finally {
      setSaving(false);
    }
  }

  const previewUrl = resolveDrivePhotoUrl(form.image_link);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengenalan Wabah</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konten "Apa itu Wabah" — muncul sekali secara otomatis saat user (termasuk guest)
          pertama kali membuka Informasi Sejarah, dan tetap bisa dibuka ulang kapan saja.
          Hanya ada satu konten untuk seluruh aplikasi.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success/40 bg-success/10 text-success">
          <AlertDescription>Konten berhasil disimpan.</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          <form id="wabah-intro-form" onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-5">
            <div className="space-y-1.5">
              <Label>Infografis (link Google Drive)</Label>
              <Input
                value={form.image_link}
                onChange={(e) => setForm({ ...form, image_link: e.target.value })}
                placeholder="https://drive.google.com/file/d/FILE_ID/view..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Caption / Teks Pendukung (opsional)</Label>
              <Textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                rows={5}
                placeholder="Teks singkat pelengkap infografis, mis. definisi wabah secara umum."
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

          {/* Preview sederhana, bukan PhonePreview -- belum ada screen type
              khusus untuk ini di PhonePreview.jsx, bisa ditambahkan
              belakangan kalau perlu preview HP yang lebih representatif. */}
          <div className="space-y-2 rounded-lg border p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Preview Infografis
            </p>
            {previewUrl ? (
              <img src={previewUrl} alt="Preview infografis wabah" className="w-full rounded-md border" />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                Belum ada link / link belum valid
              </div>
            )}
            {form.caption && (
              <p className="text-xs text-muted-foreground">{form.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}