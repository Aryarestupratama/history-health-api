import { useEffect, useState } from 'react';
import { Check, Eye, Pencil, Plus, Search, Syringe, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import PhonePreview from '@/components/PhonePreview';
import {
  DataCard,
  EmptyState,
  Field,
  InlineError,
  PageHeader,
  TableSkeleton,
  primaryButtonClass,
} from '@/components/page-kit';

/**
 * Kelola Vaksin -- data master collectible card di aplikasi mobile
 * (Architecture.md §4.8). Field mengikuti migrasi `vaccines`: name, photo,
 * photo_locked, manufacturer, disease_target, year_introduced, description;
 * relasi many-to-many `year_vaccine` lewat POST /admin/vaccines/:id/assign-years.
 *
 * REDESIGN (relayout total), diselaraskan dengan kit halaman admin:
 *  - Daftar: kolom pertama kini punya THUMBNAIL foto (fallback ikon kalau
 *    belum ada/gagal dimuat), "Wabah terkait" jadi chip (maks 3 + "+n"),
 *    "Belum diassign" jadi lencana peringatan (vaksin yang tidak terkait
 *    tahun mana pun TIDAK PERNAH ter-unlock user). Ada pencarian (nama,
 *    penyakit, produsen) dan filter Semua / Belum diassign.
 *  - Form: dua kolom (data vaksin | foto) + bagian "Wabah terkait" selebar
 *    penuh. Kolom foto menampilkan pratinjau langsung dari link Drive dan
 *    peringatan kalau link tidak dikenali. Pilihan tahun jadi chip yang
 *    dikelompokkan per era dengan "Pilih semua"/"Kosongkan" dan penghitung.
 *  - Menutup form saat ada isian belum tersimpan meminta konfirmasi.
 *  - Pratinjau HP: tombol teks diganti `Tabs` Terbuka/Terkunci.
 *
 * PERBAIKAN (di luar tampilan):
 *  - Fetch daftar gagal kini punya <InlineError> + "Coba lagi" (dulu error
 *    dan `Memuat...` polos); gagal memuat tahun tampil di dalam form dengan
 *    "Coba lagi", bukan toast yang hilang.
 *  - BUG duplikat: vaksin BARU berhasil dibuat tapi assign-years gagal ->
 *    form tetap mode "tambah", admin menekan simpan lagi -> vaksin dibuat
 *    DUA kali. Sekarang setelah vaksin terbuat form berpindah ke mode edit
 *    dan pesan error menjelaskan bagian mana yang gagal.
 *  - Deskripsi halaman yang usang ("assign dilakukan di workspace tahun")
 *    diperbarui: assign juga bisa dari form ini.
 * Logic API (GET/POST/PUT/DELETE /admin/vaccines, assign-years, GET
 * /admin/years) TIDAK berubah.
 */

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

const EMPTY_FORM = {
  name: '',
  photo: '',
  photo_locked: '',
  manufacturer: '',
  disease_target: '',
  year_introduced: '',
  description: '',
  yearIds: [], // relasi year_vaccine, dikirim lewat assign-years
};

/** Bandingkan dua isi form (yearIds tidak peduli urutan). */
function sameForm(a, b) {
  const { yearIds: ay, ...ar } = a;
  const { yearIds: by, ...br } = b;
  if (Object.keys(ar).some((k) => ar[k] !== br[k])) return false;
  if (ay.length !== by.length) return false;
  const set = new Set(by);
  return ay.every((id) => set.has(id));
}

function errorMessage(err, fallback) {
  const errors = err?.response?.data?.errors;
  const first = errors ? Object.values(errors)[0]?.[0] : null;
  return first || err?.response?.data?.message || fallback;
}

const yearLabel = (y) => y.year || y.name;

export default function VaccineManager() {
  const { confirm, dialog } = useConfirm();

  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Semua year (lintas era) untuk pilihan assign. Disimpan flat, dikelompokkan
  // per era saat render.
  const [years, setYears] = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError, setYearsError] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unassigned'

  const [form, setForm] = useState(EMPTY_FORM);
  // Snapshot isian saat form dibuka, untuk mendeteksi perubahan belum tersimpan.
  const [baseForm, setBaseForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [previewVaccine, setPreviewVaccine] = useState(null);
  const [previewLocked, setPreviewLocked] = useState(false);

  useEffect(() => {
    fetchVaccines();
    fetchYears();
  }, []);

  async function fetchVaccines() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/admin/vaccines');
      setVaccines(res.data);
    } catch (err) {
      setLoadError('Gagal memuat daftar vaksin.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchYears() {
    setYearsLoading(true);
    setYearsError(null);
    try {
      const res = await api.get('/admin/years');
      setYears(res.data);
    } catch (err) {
      setYearsError('Gagal memuat daftar tahun (wabah).');
    } finally {
      setYearsLoading(false);
    }
  }

  const yearsByEra = years.reduce((acc, year) => {
    const eraName = year.era?.name || 'Tanpa Era';
    if (!acc[eraName]) acc[eraName] = [];
    acc[eraName].push(year);
    return acc;
  }, {});

  const isDirty = showForm && !sameForm(form, baseForm);

  /* ------------------------------------------------------------ Form */

  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBaseForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(vaccine) {
    const next = {
      name: vaccine.name || '',
      photo: vaccine.photo || '',
      photo_locked: vaccine.photo_locked || '',
      manufacturer: vaccine.manufacturer || '',
      disease_target: vaccine.disease_target || '',
      year_introduced: vaccine.year_introduced != null ? String(vaccine.year_introduced) : '',
      description: vaccine.description || '',
      yearIds: (vaccine.years || []).map((y) => y.id),
    };
    setEditingId(vaccine.id);
    setForm(next);
    setBaseForm(next);
    setFormError(null);
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBaseForm(EMPTY_FORM);
    setShowForm(false);
    setFormError(null);
  }

  async function requestClose() {
    if (saving) return;
    if (isDirty) {
      const ok = await confirm({
        title: 'Buang perubahan?',
        description: 'Isian yang belum disimpan akan hilang.',
      });
      if (!ok) return;
    }
    resetForm();
  }

  function toggleYearId(yearId) {
    setForm((prev) => {
      const has = prev.yearIds.includes(yearId);
      return {
        ...prev,
        yearIds: has ? prev.yearIds.filter((id) => id !== yearId) : [...prev.yearIds, yearId],
      };
    });
  }

  // Pilih semua / kosongkan seluruh tahun dalam satu era.
  function setEraYears(eraYears, selected) {
    const ids = eraYears.map((y) => y.id);
    setForm((prev) => {
      const rest = prev.yearIds.filter((id) => !ids.includes(id));
      return { ...prev, yearIds: selected ? [...rest, ...ids] : rest };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const wasEditing = !!editingId;
    let vaccineId = editingId;

    // 1) Data vaksin.
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
      if (vaccineId) {
        await api.put(`/admin/vaccines/${vaccineId}`, payload);
      } else {
        const res = await api.post('/admin/vaccines', payload);
        vaccineId = res.data.id;
        // Vaksin sudah ada di server: pindah ke mode edit supaya percobaan
        // simpan berikutnya (kalau langkah 2 gagal) tidak membuat duplikat.
        setEditingId(vaccineId);
      }
    } catch (err) {
      setFormError(errorMessage(err, 'Gagal menyimpan vaksin.'));
      setSaving(false);
      return;
    }

    // 2) Relasi tahun -- request terpisah karena store/update vaksin tidak
    // menangani many-to-many; sync() lewat assign-years jadi sumber kebenaran
    // relasi year_vaccine, baik vaksin baru maupun diedit.
    try {
      await api.post(`/admin/vaccines/${vaccineId}/assign-years`, { year_ids: form.yearIds });
    } catch (err) {
      setFormError(
        'Data vaksin sudah tersimpan, tetapi pilihan tahun gagal disimpan. Tekan simpan lagi untuk mencoba ulang.'
      );
      fetchVaccines();
      setSaving(false);
      return;
    }

    toast.success(wasEditing ? 'Vaksin berhasil diupdate' : 'Vaksin baru berhasil ditambahkan');
    resetForm();
    fetchVaccines();
    setSaving(false);
  }

  async function handleDelete(vaccine) {
    const ok = await confirm({
      title: `Hapus vaksin "${vaccine.name}"?`,
      description:
        'Ini juga akan melepas relasinya dari semua tahun (wabah) terkait. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/vaccines/${vaccine.id}`);
      toast.success(`Vaksin "${vaccine.name}" berhasil dihapus`);
      fetchVaccines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus vaksin.');
    }
  }

  function openPreview(vaccine) {
    setPreviewLocked(false);
    setPreviewVaccine(vaccine);
  }

  function closePreview() {
    setPreviewVaccine(null);
    setPreviewLocked(false);
  }

  /* ------------------------------------------------------- Turunan daftar */

  const isUnassigned = (v) => !v.years || v.years.length === 0;
  const unassignedCount = vaccines.filter(isUnassigned).length;

  const needle = search.trim().toLowerCase();
  const visible = vaccines.filter((v) => {
    if (filter === 'unassigned' && !isUnassigned(v)) return false;
    if (!needle) return true;
    return [v.name, v.disease_target, v.manufacturer].some((f) => (f || '').toLowerCase().includes(needle));
  });

  const addButton = (
    <Button onClick={openAddForm} className={primaryButtonClass}>
      <Plus className="h-4 w-4" /> Tambah Vaksin
    </Button>
  );

  return (
    <div className="space-y-6">
      {dialog}

      <PageHeader
        title="Kelola Vaksin"
        count={loading || loadError ? null : vaccines.length}
        description="Data vaksin untuk collectible card di aplikasi mobile. Vaksin ter-unlock otomatis begitu user menyelesaikan tahun (wabah) yang terkait, jadi pastikan tiap vaksin sudah diassign."
        actions={addButton}
      />

      {loadError ? (
        <InlineError message={loadError} onRetry={fetchVaccines} />
      ) : loading ? (
        <TableSkeleton rows={4} />
      ) : vaccines.length === 0 ? (
        <EmptyState
          icon={Syringe}
          title="Belum ada vaksin"
          description="Tambahkan vaksin pertama, lalu hubungkan ke tahun (wabah) supaya bisa dikoleksi user."
          action={addButton}
        />
      ) : (
        <div className="space-y-4 duration-500 animate-in fade-in">
          {/* Toolbar: pencarian + filter status assign */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, penyakit, atau produsen"
                aria-label="Cari vaksin"
                className="pl-9"
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Semua ({vaccines.length})</TabsTrigger>
                <TabsTrigger value="unassigned">Belum diassign ({unassignedCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Tidak ada vaksin yang cocok"
              description={
                filter === 'unassigned' && !needle
                  ? 'Semua vaksin sudah terhubung ke minimal satu tahun.'
                  : 'Coba kata kunci lain atau ubah filter.'
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                  }}
                >
                  Reset pencarian
                </Button>
              }
            />
          ) : (
            <DataCard>
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                    <TableHead>Vaksin</TableHead>
                    <TableHead>Penyakit target</TableHead>
                    <TableHead>Produsen</TableHead>
                    <TableHead>Wabah terkait</TableHead>
                    <TableHead className="w-28 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((vaccine, index) => (
                    <TableRow
                      key={vaccine.id}
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: 'backwards' }}
                      className="duration-300 animate-in fade-in"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <VaccineThumb url={resolveDrivePhotoUrl(vaccine.photo)} />
                          <div className="min-w-0">
                            <p className="font-medium leading-tight">{vaccine.name}</p>
                            {vaccine.description && (
                              <p className="mt-0.5 line-clamp-1 max-w-64 text-xs text-muted-foreground">
                                {vaccine.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{vaccine.disease_target}</TableCell>
                      <TableCell>
                        <p className="text-muted-foreground">{vaccine.manufacturer || '\u2014'}</p>
                        {vaccine.year_introduced ? (
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground/80">
                            sejak {vaccine.year_introduced}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <YearChips years={vaccine.years} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Preview ${vaccine.name}`}
                            title="Preview"
                            onClick={() => openPreview(vaccine)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${vaccine.name}`}
                            title="Edit"
                            onClick={() => startEdit(vaccine)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Hapus ${vaccine.name}`}
                            title="Hapus"
                            onClick={() => handleDelete(vaccine)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataCard>
          )}
        </div>
      )}

      {/* ------------------------------------------------------ Dialog form */}
      <Dialog open={showForm} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gamify/10 text-gamify">
              <Syringe className="h-5 w-5" />
            </div>
            <DialogTitle>{editingId ? 'Edit Vaksin' : 'Vaksin Baru'}</DialogTitle>
            <DialogDescription>
              Data ini dipakai sebagai collectible card di aplikasi mobile.
            </DialogDescription>
          </DialogHeader>

          {formError && <InlineError message={formError} />}

          <form id="vaccine-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              {/* Kiri: data vaksin */}
              <div className="space-y-4">
                <Field id="vaccine-name" label="Nama vaksin">
                  <Input
                    id="vaccine-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </Field>
                <Field id="vaccine-disease" label="Penyakit target">
                  <Input
                    id="vaccine-disease"
                    value={form.disease_target}
                    onChange={(e) => setForm({ ...form, disease_target: e.target.value })}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field id="vaccine-manufacturer" label="Produsen">
                    <Input
                      id="vaccine-manufacturer"
                      value={form.manufacturer}
                      onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    />
                  </Field>
                  <Field id="vaccine-year" label="Tahun diperkenalkan">
                    <Input
                      id="vaccine-year"
                      type="number"
                      value={form.year_introduced}
                      onChange={(e) => setForm({ ...form, year_introduced: e.target.value })}
                      placeholder="mis. 1955"
                      className="tabular-nums"
                    />
                  </Field>
                </div>
                <Field id="vaccine-description" label="Peran dalam sejarah kesehatan">
                  <Textarea
                    id="vaccine-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={5}
                    className="resize-y leading-relaxed"
                    required
                  />
                </Field>
              </div>

              {/* Kanan: foto */}
              <div className="space-y-4">
                <PhotoField
                  id="vaccine-photo"
                  label="Foto (link Google Drive)"
                  hint='Gunakan link "Share" Google Drive. Tampil di kartu setelah vaksin ter-unlock.'
                  value={form.photo}
                  onChange={(v) => setForm({ ...form, photo: v })}
                />
                <PhotoField
                  id="vaccine-photo-locked"
                  label="Foto siluet / terkunci (link Google Drive)"
                  hint="Tampil sebelum vaksin ter-unlock, dan dipakai Flutter untuk animasi reveal saat unlock."
                  value={form.photo_locked}
                  onChange={(v) => setForm({ ...form, photo_locked: v })}
                />
              </div>
            </div>

            {/* Bawah: assign tahun */}
            <section className="space-y-3 border-t pt-5" aria-labelledby="vaccine-years-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="vaccine-years-title" className="text-sm font-medium">
                    Wabah terkait
                  </h3>
                  <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Vaksin ter-unlock begitu user menyelesaikan salah satu tahun yang dipilih. Satu
                    vaksin boleh terkait lebih dari satu tahun. Bisa juga diatur dari tab "Rangkuman
                    &amp; Vaksin" di Workspace Wabah.
                  </p>
                </div>
                <Badge variant={form.yearIds.length ? 'gamify' : 'secondary'}>
                  {form.yearIds.length} dipilih
                </Badge>
              </div>

              {yearsLoading ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Memuat daftar tahun...
                </p>
              ) : yearsError ? (
                <InlineError message={yearsError} onRetry={fetchYears} />
              ) : years.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Belum ada data tahun (wabah). Buat dulu lewat Content Studio.
                </p>
              ) : (
                <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border bg-secondary/30 p-4">
                  {Object.entries(yearsByEra).map(([eraName, eraYears]) => {
                    const selectedInEra = eraYears.filter((y) => form.yearIds.includes(y.id)).length;
                    const allSelected = selectedInEra === eraYears.length;
                    return (
                      <div key={eraName} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {eraName}
                            <span className="ml-1.5 tabular-nums text-muted-foreground/70">
                              {selectedInEra}/{eraYears.length}
                            </span>
                          </p>
                          <button
                            type="button"
                            onClick={() => setEraYears(eraYears, !allSelected)}
                            className="rounded px-1.5 py-0.5 text-xs font-medium text-gamify hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {allSelected ? 'Kosongkan' : 'Pilih semua'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {eraYears.map((year) => {
                            const on = form.yearIds.includes(year.id);
                            return (
                              <button
                                key={year.id}
                                type="button"
                                aria-pressed={on}
                                title={year.title ? `${yearLabel(year)}: ${year.title}` : undefined}
                                onClick={() => toggleYearId(year.id)}
                                className={cn(
                                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                                  on
                                    ? 'border-gamify bg-gamify/10 font-medium text-gamify'
                                    : 'bg-background hover:bg-accent'
                                )}
                              >
                                {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                                {yearLabel(year)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </form>

          <DialogFooter className="items-center gap-2 sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              {isDirty && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
                  Ada perubahan yang belum disimpan
                </>
              )}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={requestClose} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" form="vaccine-form" className={primaryButtonClass} disabled={saving}>
                {saving ? 'Menyimpan...' : editingId ? 'Update Vaksin' : 'Tambah Vaksin'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- Dialog preview */}
      <Dialog open={!!previewVaccine} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewVaccine?.name || 'Vaksin'}</DialogTitle>
            <DialogDescription>Tampilan kartu vaksin di aplikasi mobile.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <Tabs value={previewLocked ? 'locked' : 'open'} onValueChange={(v) => setPreviewLocked(v === 'locked')}>
              <TabsList>
                <TabsTrigger value="open">Terbuka</TabsTrigger>
                <TabsTrigger value="locked">Terkunci</TabsTrigger>
              </TabsList>
            </Tabs>
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

/* ----------------------------------------------------------------- Bagian */

/** Thumbnail foto vaksin di tabel; ikon kalau belum ada / gagal dimuat. */
function VaccineThumb({ url }) {
  const [failed, setFailed] = useState(false);

  // Link berubah (mis. setelah edit) -> coba muat lagi.
  useEffect(() => {
    setFailed(false);
  }, [url]);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary text-muted-foreground">
      {url && !failed ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Syringe className="h-4 w-4" aria-hidden="true" />
      )}
    </div>
  );
}

/** Tahun terkait sebagai chip (maks 3, sisanya "+n"); peringatan kalau kosong. */
function YearChips({ years }) {
  if (!years || years.length === 0) {
    return <Badge variant="warning">Belum diassign</Badge>;
  }
  const shown = years.slice(0, 3);
  const rest = years.slice(3);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((y) => (
        <Badge key={y.id} variant="outline" className="tabular-nums">
          {yearLabel(y)}
        </Badge>
      ))}
      {rest.length > 0 && (
        <Badge variant="secondary" title={rest.map(yearLabel).join(', ')}>
          +{rest.length}
        </Badge>
      )}
    </div>
  );
}

/** Input link Drive + pratinjau gambar langsung + peringatan link tidak dikenali. */
function PhotoField({ id, label, hint, value, onChange }) {
  const trimmed = value.trim();
  const url = resolveDrivePhotoUrl(trimmed);
  const invalid = trimmed !== '' && !url;

  return (
    <Field id={id} label={label} hint={invalid ? undefined : hint}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
          />
          {invalid && (
            <p role="status" className="text-xs text-warning">
              Link tidak dikenali sebagai link file Google Drive, foto tidak akan tampil.
            </p>
          )}
        </div>
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary text-muted-foreground"
          aria-hidden="true"
        >
          {url ? (
            <img
              key={url}
              src={url}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <Syringe className="h-5 w-5" />
          )}
        </div>
      </div>
    </Field>
  );
}