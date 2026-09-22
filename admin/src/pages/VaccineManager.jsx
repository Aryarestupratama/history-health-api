import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import PhonePreview from "@/components/PhonePreview";

// Versi ringan LinkParserService::extractDriveFileId/toDriveImageUrl
// (backend) khusus dipakai di sisi klien supaya preview HP bisa live
// update saat admin mengetik, tanpa round-trip ke API. Format URL ('thumbnail')
// harus tetap disamakan dengan backend agar preview representatif terhadap
// tampilan asli di app (Design.md §4.3).
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

// Menggantikan FigureManager.jsx (Architecture.md §4.8 — collectible card:
// tokoh -> vaksin). Field mengikuti migrasi `vaccines` (progress.md):
// name, photo, manufacturer, disease_target, year_introduced, description.
const EMPTY_FORM = {
  name: '',
  photo: '',
  photo_locked: '',
  manufacturer: '',
  disease_target: '',
  year_introduced: '',
  description: '',
  yearIds: [], // baru — relasi year_vaccine diisi langsung dari sini (assign-years)
};

export default function VaccineManager() {
  const { confirm, dialog } = useConfirm();

  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Daftar semua year (lintas era) untuk pilihan assign — dipakai form,
  // bukan untuk tabel utama. Dikelompokkan per era saat render (lihat
  // yearsByEra di bawah), bukan disimpan sudah terkelompok, supaya sumber
  // datanya tetap flat & gampang di-lookup by id.
  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewVaccine, setPreviewVaccine] = useState(null);
  const [previewLocked, setPreviewLocked] = useState(false);

  useEffect(() => {
    fetchVaccines();
    fetchYears();
  }, []);

  async function fetchVaccines() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/vaccines');
      setVaccines(res.data);
    } catch (err) {
      setError('Gagal memuat daftar vaksin.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchYears() {
    setYearsLoading(true);
    try {
      const res = await api.get('/admin/years');
      setYears(res.data);
    } catch (err) {
      toast.error('Gagal memuat daftar tahun (wabah) untuk pilihan assign.');
    } finally {
      setYearsLoading(false);
    }
  }

  // Kelompokkan years per era untuk render checklist — dihitung tiap render
  // dari `years` (bukan disimpan terpisah) supaya selalu konsisten dengan
  // sumber data flat-nya.
  const yearsByEra = years.reduce((acc, year) => {
    const eraName = year.era?.name || 'Tanpa Era';
    if (!acc[eraName]) acc[eraName] = [];
    acc[eraName].push(year);
    return acc;
  }, {});

  function toggleYearId(yearId) {
    setForm((prev) => {
      const has = prev.yearIds.includes(yearId);
      return {
        ...prev,
        yearIds: has ? prev.yearIds.filter((id) => id !== yearId) : [...prev.yearIds, yearId],
      };
    });
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        photo: form.photo || null,
        photo_locked: form.photo_locked || null,
        manufacturer: form.manufacturer || null,
        disease_target: form.disease_target,
        year_introduced: form.year_introduced ? Number(form.year_introduced) : null,
        description: form.description,
      };
      let vaccineId = editingId;
      if (editingId) {
        await api.put(`/admin/vaccines/${editingId}`, payload);
      } else {
        const res = await api.post('/admin/vaccines', payload);
        vaccineId = res.data.id;
      }

      // Assign year selalu dikirim sebagai request terpisah (bukan digabung
      // ke payload utama) karena endpoint store/update vaksin tidak
      // menangani relasi many-to-many — sync() lewat assign-years yang jadi
      // source of truth relasi year_vaccine, baik saat vaksin baru dibuat
      // maupun diedit.
      await api.post(`/admin/vaccines/${vaccineId}/assign-years`, { year_ids: form.yearIds });

      toast.success(editingId ? 'Vaksin berhasil diupdate' : 'Vaksin baru berhasil ditambahkan');
      resetForm();
      fetchVaccines();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan vaksin.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(vaccine) {
    setEditingId(vaccine.id);
    setForm({
      name: vaccine.name || '',
      photo: vaccine.photo || '',
      photo_locked: vaccine.photo_locked || '',
      manufacturer: vaccine.manufacturer || '',
      disease_target: vaccine.disease_target || '',
      year_introduced: vaccine.year_introduced != null ? String(vaccine.year_introduced) : '',
      description: vaccine.description || '',
      yearIds: (vaccine.years || []).map((y) => y.id),
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError(null);
  }

  function openPreview(vaccine) {
    setPreviewLocked(false);
    setPreviewVaccine(vaccine);
  }

  function closePreview() {
    setPreviewVaccine(null);
    setPreviewLocked(false);
  }

  async function handleDelete(vaccine) {
    const ok = await confirm({
      title: `Hapus vaksin "${vaccine.name}"?`,
      description: 'Ini juga akan melepas relasinya dari semua tahun (wabah) terkait. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/vaccines/${vaccine.id}`);
      toast.success(`Vaksin "${vaccine.name}" berhasil dihapus`);
      fetchVaccines();
    } catch (err) {
      toast.error('Gagal menghapus vaksin.');
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kelola Vaksin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data vaksin untuk collectible card di aplikasi mobile. Assign ke tahun (wabah) dilakukan
            di halaman workspace tahun.
          </p>
        </div>
        <Button onClick={openAddForm} className="bg-gamify text-white hover:bg-gamify/90">
          <Plus className="h-4 w-4" /> Tambah Vaksin
        </Button>
      </div>

      {error && !showForm && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : vaccines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada vaksin.</p>
      ) : (
        <div className="rounded-lg border border-l-4 border-l-gamify">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Vaksin</TableHead>
                <TableHead>Penyakit Target</TableHead>
                <TableHead>Produsen</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>Tahun (Wabah) Terkait</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaccines.map((vaccine) => (
                <TableRow key={vaccine.id}>
                  <TableCell className="font-medium">
                    {vaccine.name}
                    {vaccine.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs font-normal text-muted-foreground">
                        {vaccine.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{vaccine.disease_target}</TableCell>
                  <TableCell className="text-muted-foreground">{vaccine.manufacturer || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{vaccine.year_introduced || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {vaccine.years && vaccine.years.length > 0
                      ? vaccine.years.map((y) => y.year || y.name).join(', ')
                      : <span className="italic">Belum diassign</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPreview(vaccine)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(vaccine)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(vaccine)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vaksin' : 'Vaksin Baru'}</DialogTitle>
            <DialogDescription>
              Data ini dipakai sebagai collectible card di aplikasi mobile.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form id="vaccine-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* Kolom kiri — identitas & data dasar vaksin */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Vaksin</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Foto (link Google Drive)</Label>
                <Input
                  value={form.photo}
                  onChange={(e) => setForm({ ...form, photo: e.target.value })}
                  placeholder="https://drive.google.com/file/d/FILE_ID/view..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Foto Siluet / Terkunci (link Google Drive)</Label>
                <Input
                  value={form.photo_locked}
                  onChange={(e) => setForm({ ...form, photo_locked: e.target.value })}
                  placeholder="https://drive.google.com/file/d/FILE_ID/view..."
                />
                <p className="text-xs text-muted-foreground">
                  Ditampilkan sebelum vaksin ter-unlock user (siluet/placeholder). Dipakai Flutter untuk
                  animasi reveal saat unlock.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Produsen</Label>
                  <Input
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tahun Diperkenalkan</Label>
                  <Input
                    type="number"
                    value={form.year_introduced}
                    onChange={(e) => setForm({ ...form, year_introduced: e.target.value })}
                    placeholder="mis. 1955"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Penyakit Target</Label>
                <Input
                  value={form.disease_target}
                  onChange={(e) => setForm({ ...form, disease_target: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Kolom kanan — deskripsi & assign tahun (elemen yang lebih tinggi) */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Deskripsi Peran dalam Sejarah Kesehatan</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tahun (Wabah) Terkait</Label>
                <p className="text-xs text-muted-foreground">
                  Vaksin ini otomatis ter-unlock user begitu status "year completed" tercapai pada
                  tahun yang dicentang di bawah (relasi many-to-many, satu vaksin boleh terkait
                  lebih dari satu tahun). Ini alternatif cepat dari assign lewat tab "Rangkuman &amp;
                  Vaksin" di Workspace Wabah per-tahun.
                </p>
                {yearsLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat daftar tahun...</p>
                ) : years.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada data tahun (wabah).</p>
                ) : (
                  <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border p-3">
                    {Object.entries(yearsByEra).map(([eraName, eraYears]) => (
                      <div key={eraName} className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{eraName}</p>
                        <div className="space-y-1">
                          {eraYears.map((year) => (
                            <label key={year.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={form.yearIds.includes(year.id)}
                                onChange={() => toggleYearId(year.id)}
                                className="h-4 w-4 rounded border-input accent-gamify"
                              />
                              {year.year || year.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>Batal</Button>
            <Button type="submit" form="vaccine-form" className="bg-gamify text-white hover:bg-gamify/90" disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Update Vaksin' : 'Tambah Vaksin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewVaccine} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewVaccine?.name || 'Vaksin'}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewLocked((v) => !v)}
              className="self-end text-xs font-medium text-gamify hover:underline"
            >
              {previewLocked ? 'Lihat versi terbuka' : 'Simulasikan versi terkunci'}
            </button>
            {previewVaccine && (
              <PhonePreview
                screen="vaccine-detail"
                compact
                data={{
                  name: previewVaccine.name,
                  resolvedPhotoUrl: resolveDrivePhotoUrl(previewVaccine.photo),
                  resolvedPhotoLockedUrl: resolveDrivePhotoUrl(previewVaccine.photo_locked),
                  manufacturer: previewVaccine.manufacturer,
                  diseaseTarget: previewVaccine.disease_target,
                  yearIntroduced: previewVaccine.year_introduced,
                  description: previewVaccine.description,
                  locked: previewLocked,
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}