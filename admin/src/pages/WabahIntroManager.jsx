import { useState, useEffect } from 'react';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PhonePreview from '../components/PhonePreview';

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
        is_published: form.is_published,
      });
      setForm({
        image_link: res.data.image_link || '',
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
          Konten "Apa itu Wabah" — hanya bisa diakses lewat ikon info di header roadmap era
          pada tab Informasi Sejarah (tidak ada tampilan otomatis). Hanya ada satu konten
          untuk seluruh aplikasi, berupa infografis saja tanpa teks pendukung.
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
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <form id="wabah-intro-form" onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-5">
            <div className="space-y-1.5">
              <Label>Infografis (link Google Drive)</Label>
              <Input
                value={form.image_link}
                onChange={(e) => setForm({ ...form, image_link: e.target.value })}
                placeholder="https://drive.google.com/file/d/FILE_ID/view..."
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

          {/* PhonePreview screen="wabah-intro" -- sebelumnya <img> sederhana,
              sekarang konsisten dengan preview HP di Content Studio/Kelola
              Vaksin (backlog lama "integrasikan preview ke PhonePreview.jsx",
              sekarang selesai). Sesuaikan path import di atas kalau lokasi
              PhonePreview.jsx di project Anda beda dari asumsi (satu folder
              yang sama, ./PhonePreview). */}
          <PhonePreview screen="wabah-intro" data={{ resolvedImageUrl: previewUrl }} compact />
        </div>
      )}
    </div>
  );
}