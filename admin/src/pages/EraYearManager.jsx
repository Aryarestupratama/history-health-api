import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Landmark,
  CalendarRange,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';
import { getEraAccent } from '@/config/branding';
import {
  CardGridSkeleton,
  EmptyState,
  Field,
  InlineError,
  PageHeader,
  TableSkeleton,
  primaryButtonClass,
} from '@/components/page-kit';

// Kelola Era & Tahun (housekeeping, terpisah dari Content Studio).
//
// REDESIGN (relayout):
//  - Era: kartu dengan area klik utama + tombol edit/hapus yang SELALU
//    terlihat (sebelumnya hanya muncul saat hover, jadi tak terjangkau di
//    layar sentuh/keyboard, dan berada di dalam elemen role="button").
//  - Tahun: garis waktu vertikal (bukan grid kartu) -- tahun memang urutan
//    kronologis, dan user membuka tahun berikutnya setelah menyelesaikan
//    tahun sebelumnya (R-YEAR-02), jadi urutannya adalah informasi.
//  - Navigasi: breadcrumb "Semua masa > Nama era" menggantikan tombol
//    "Kembali"; tombol "Tambah Tahun" naik ke header halaman.
//  - Tombol utama pakai `primaryButtonClass` (kit), bukan warna era. Warna
//    era (`getEraAccent`) tetap dipakai sebagai aksen: ikon, titik & garis.
//
// PERBAIKAN (di luar tampilan):
//  - Error dipisah per konteks (daftar era / daftar tahun / form era / form
//    tahun). Sebelumnya satu state `error` dipakai bersama sehingga "Coba
//    lagi" selalu memuat ulang ERA walau yang gagal adalah TAHUN.
//  - Kalau fetch gagal, tidak lagi menampilkan "Belum ada era/tahun" yang
//    menyesatkan -- yang tampil pesan error + Coba lagi.
//  - Tombol simpan punya status "Menyimpan..." (mencegah klik ganda).
//  - Peringatan tahun duplikat kini juga berlaku saat mengedit.
//  - Saat nama era diubah, slug ikut berubah (perilaku lama, tidak diubah)
//    -- sekarang perubahan itu diperingatkan di dialog, karena slug dipakai
//    untuk warna era & rute publik.
// Logic CRUD & guard "create Era dihilangkan" TIDAK berubah.

// Ubah "Masa Kolonial" -> "masa-kolonial"
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const EMPTY_ERA_FORM = { name: '', slug: '', description: '', order: '' };
const EMPTY_YEAR_FORM = { year: '', title: '' };

export default function EraYearManager() {
  const { confirm, dialog } = useConfirm();

  const [eras, setEras] = useState([]);
  const [selectedEraId, setSelectedEraId] = useState(null);
  // Tahun di-cache per era, di-fetch on-demand pas era dipilih pertama kali
  const [yearsByEra, setYearsByEra] = useState({});
  const [loadingEras, setLoadingEras] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [erasError, setErasError] = useState(null);
  const [yearsError, setYearsError] = useState(null);

  // Form state - Era (create sengaja tidak ada, lihat handleEraSubmit)
  const [eraForm, setEraForm] = useState(EMPTY_ERA_FORM);
  const [editingEraId, setEditingEraId] = useState(null);
  const [showEraForm, setShowEraForm] = useState(false);
  const [savingEra, setSavingEra] = useState(false);
  const [eraFormError, setEraFormError] = useState(null);

  // Form state - Year
  const [yearForm, setYearForm] = useState(EMPTY_YEAR_FORM);
  const [editingYearId, setEditingYearId] = useState(null);
  const [showYearForm, setShowYearForm] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [yearFormError, setYearFormError] = useState(null);

  useEffect(() => {
    fetchEras();
  }, []);

  async function fetchEras() {
    setLoadingEras(true);
    setErasError(null);
    try {
      const res = await api.get('/admin/eras');
      setEras(res.data);
    } catch (err) {
      setErasError('Gagal memuat daftar era.');
    } finally {
      setLoadingEras(false);
    }
  }

  async function fetchYears(eraId) {
    setLoadingYears(true);
    setYearsError(null);
    try {
      const res = await api.get('/admin/years', { params: { era_id: eraId } });
      setYearsByEra((prev) => ({ ...prev, [eraId]: res.data }));
    } catch (err) {
      setYearsError('Gagal memuat daftar tahun.');
    } finally {
      setLoadingYears(false);
    }
  }

  function openEra(era) {
    setSelectedEraId(era.id);
    resetYearForm();
    setYearsError(null);
    if (!yearsByEra[era.id]) fetchYears(era.id);
  }

  function backToEraGrid() {
    setSelectedEraId(null);
  }

  const selectedEra = eras.find((e) => e.id === selectedEraId) || null;
  const selectedEraYears = [...(yearsByEra[selectedEraId] || [])].sort((a, b) => a.year - b.year);
  const yearsLoaded = !!selectedEra && !!yearsByEra[selectedEra.id];

  // ---------- ERA (edit-only, lihat catatan sebelumnya di progress.md) ----------
  function handleEraNameChange(name) {
    setEraForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  }

  // Catatan: create/store Era sengaja dihilangkan — 3 era (Kolonial/
  // Kemerdekaan/Modern) sudah paten diisi via EraSeeder, admin hanya
  // boleh edit (nama/deskripsi/urutan), bukan menambah era baru.
  async function handleEraSubmit(e) {
    e.preventDefault();
    if (!editingEraId) return; // guard: form ini sekarang hanya untuk edit
    setEraFormError(null);
    setSavingEra(true);
    try {
      const payload = { ...eraForm, order: Number(eraForm.order) };
      await api.put(`/admin/eras/${editingEraId}`, payload);
      toast.success('Era berhasil diupdate');
      resetEraForm();
      fetchEras();
    } catch (err) {
      setEraFormError(err.response?.data?.message || 'Gagal menyimpan era.');
    } finally {
      setSavingEra(false);
    }
  }

  function startEditEra(era) {
    setEditingEraId(era.id);
    setEraForm({
      name: era.name,
      slug: era.slug,
      description: era.description || '',
      order: era.order,
    });
    setEraFormError(null);
    setShowEraForm(true);
  }

  function resetEraForm() {
    setEditingEraId(null);
    setEraForm(EMPTY_ERA_FORM);
    setShowEraForm(false);
    setEraFormError(null);
  }

  async function handleDeleteEra(era) {
    const yearCount = era.years_count;
    const ok = await confirm({
      title: `Hapus era "${era.name}"?`,
      description:
        (yearCount != null
          ? `Ini akan menghapus ${yearCount} tahun beserta semua section di dalamnya. `
          : 'Ini akan menghapus semua tahun & section di dalamnya. ') +
        'Era baru tidak bisa ditambahkan lagi dari halaman ini. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/eras/${era.id}`);
      toast.success(`Era "${era.name}" berhasil dihapus`);
      if (selectedEraId === era.id) setSelectedEraId(null);
      fetchEras();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus era.');
    }
  }

  // ---------- YEAR CRUD ----------
  function openAddYearForm() {
    resetYearForm();
    setShowYearForm(true);
  }

  async function handleYearSubmit(e) {
    e.preventDefault();
    if (!selectedEra) return;
    setYearFormError(null);
    setSavingYear(true);
    try {
      const payload = {
        era_id: selectedEra.id,
        year: Number(yearForm.year),
        title: yearForm.title,
      };
      if (editingYearId) {
        await api.put(`/admin/years/${editingYearId}`, payload);
        toast.success('Tahun berhasil diupdate');
      } else {
        await api.post('/admin/years', payload);
        toast.success('Tahun baru berhasil ditambahkan');
      }
      resetYearForm();
      fetchYears(selectedEra.id);
    } catch (err) {
      setYearFormError(err.response?.data?.message || 'Gagal menyimpan tahun.');
    } finally {
      setSavingYear(false);
    }
  }

  function startEditYear(year) {
    setEditingYearId(year.id);
    setYearForm({ year: year.year, title: year.title });
    setYearFormError(null);
    setShowYearForm(true);
  }

  function resetYearForm() {
    setEditingYearId(null);
    setYearForm(EMPTY_YEAR_FORM);
    setShowYearForm(false);
    setYearFormError(null);
  }

  async function handleDeleteYear(year) {
    const ok = await confirm({
      title: `Hapus tahun "${year.year} — ${year.title}"?`,
      description: 'Ini akan menghapus semua section di dalamnya. Tindakan ini tidak bisa dibatalkan.',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/years/${year.id}`);
      toast.success(`Tahun "${year.year} — ${year.title}" berhasil dihapus`);
      fetchYears(selectedEra.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tahun.');
    }
  }

  // ---------- turunan untuk dialog ----------
  const editingEra = eras.find((e) => e.id === editingEraId) || null;
  const slugChanged = !!editingEra && eraForm.slug !== editingEra.slug;
  const duplicateYear =
    yearForm.year !== '' &&
    selectedEraYears.some((y) => y.year === Number(yearForm.year) && y.id !== editingYearId);
  const selectedAccent = selectedEra ? getEraAccent(selectedEra.slug).hex : null;

  return (
    <div className="space-y-6">
      {dialog}

      <PageHeader
        title="Kelola Era & Tahun"
        count={selectedEra && yearsLoaded ? selectedEraYears.length : null}
        description={
          selectedEra
            ? `Tahun-tahun wabah dalam ${selectedEra.name}. User membuka tahun berikutnya setelah menyelesaikan tahun sebelumnya.`
            : '3 masa sejarah sudah ditetapkan (Kolonial, Kemerdekaan, Modern). Pilih salah satu untuk mengelola tahun-tahunnya.'
        }
        actions={
          selectedEra && (
            <Button onClick={openAddYearForm} className={primaryButtonClass}>
              <Plus className="h-4 w-4" /> Tambah Tahun
            </Button>
          )
        }
      />

      {!selectedEra ? (
        loadingEras ? (
          <CardGridSkeleton count={3} />
        ) : erasError ? (
          <InlineError message={erasError} onRetry={fetchEras} />
        ) : eras.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Belum ada era"
            description="Data era belum tersedia dari server."
          />
        ) : (
          <EraGrid eras={eras} onSelect={openEra} onEdit={startEditEra} onDelete={handleDeleteEra} />
        )
      ) : (
        <div className="space-y-5 duration-500 animate-in fade-in">
          <nav aria-label="Navigasi era" className="flex items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={backToEraGrid}
              className="rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Semua masa
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
            <span aria-current="page" className="flex items-center gap-2 font-medium">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: selectedAccent }}
                aria-hidden="true"
              />
              {selectedEra.name}
            </span>
          </nav>

          {loadingYears && !yearsLoaded ? (
            <TableSkeleton rows={4} />
          ) : yearsError && !yearsLoaded ? (
            <InlineError message={yearsError} onRetry={() => fetchYears(selectedEra.id)} />
          ) : selectedEraYears.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Belum ada tahun di era ini"
              description="Tambahkan tahun wabah pertama untuk mulai mengisi konten era ini."
              action={
                <Button onClick={openAddYearForm} className={primaryButtonClass}>
                  <Plus className="h-4 w-4" /> Tambah Tahun
                </Button>
              }
            />
          ) : (
            <>
              {yearsError && <InlineError message={yearsError} onRetry={() => fetchYears(selectedEra.id)} />}
              <YearTimeline
                years={selectedEraYears}
                accent={selectedAccent}
                onEdit={startEditYear}
                onDelete={handleDeleteYear}
              />
            </>
          )}
        </div>
      )}

      {/* ---------- Dialog Edit Era ---------- */}
      <Dialog open={showEraForm} onOpenChange={(open) => !open && resetEraForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {editingEra && (
              <div
                className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${getEraAccent(editingEra.slug).hex}1f`,
                  color: getEraAccent(editingEra.slug).hex,
                }}
              >
                <Landmark className="h-5 w-5" />
              </div>
            )}
            <DialogTitle>Edit era</DialogTitle>
            <DialogDescription>
              Ubah nama, deskripsi, atau urutan tampil era ini. Era baru tidak bisa ditambah dari sini.
            </DialogDescription>
          </DialogHeader>

          {eraFormError && <InlineError message={eraFormError} />}

          <form id="era-form" onSubmit={handleEraSubmit} className="space-y-4">
            <Field id="era-name" label="Nama">
              <Input
                id="era-name"
                value={eraForm.name}
                onChange={(e) => handleEraNameChange(e.target.value)}
                required
              />
            </Field>
            <Field id="era-slug" label="Slug (otomatis dari nama)">
              <Input
                id="era-slug"
                value={eraForm.slug}
                disabled
                className="bg-muted font-mono text-xs text-muted-foreground"
              />
            </Field>
            {slugChanged && (
              <p role="status" className="flex items-start gap-1.5 text-xs leading-relaxed text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Slug akan berubah dari &quot;{editingEra.slug}&quot;. Slug dipakai untuk warna era dan
                alamat publik, jadi ubah nama hanya kalau memang perlu.
              </p>
            )}
            <Field id="era-description" label="Deskripsi">
              <Textarea
                id="era-description"
                value={eraForm.description}
                onChange={(e) => setEraForm({ ...eraForm, description: e.target.value })}
                rows={3}
              />
            </Field>
            <Field id="era-order" label="Urutan" hint="Menentukan urutan tampil era di aplikasi.">
              <Input
                id="era-order"
                type="number"
                value={eraForm.order}
                onChange={(e) => setEraForm({ ...eraForm, order: e.target.value })}
                required
              />
            </Field>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetEraForm}>Batal</Button>
            <Button type="submit" form="era-form" className={primaryButtonClass} disabled={savingEra}>
              {savingEra ? 'Menyimpan...' : 'Update Era'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Dialog Tambah/Edit Tahun ---------- */}
      <Dialog open={showYearForm} onOpenChange={(open) => !open && resetYearForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {selectedEra && (
              <div
                className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${selectedAccent}1f`, color: selectedAccent }}
              >
                <CalendarRange className="h-5 w-5" />
              </div>
            )}
            <DialogTitle>{editingYearId ? 'Edit tahun' : 'Tahun baru'}</DialogTitle>
            <DialogDescription>
              {selectedEra ? `Tahun wabah dalam ${selectedEra.name}.` : ''}
            </DialogDescription>
          </DialogHeader>

          {yearFormError && <InlineError message={yearFormError} />}

          <form id="year-form" onSubmit={handleYearSubmit} className="space-y-4">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4">
              <Field id="year-number" label="Tahun">
                <Input
                  id="year-number"
                  type="number"
                  value={yearForm.year}
                  onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                  className="tabular-nums"
                  autoFocus
                  required
                />
              </Field>
              <Field id="year-title" label="Judul">
                <Input
                  id="year-title"
                  value={yearForm.title}
                  onChange={(e) => setYearForm({ ...yearForm, title: e.target.value })}
                  required
                />
              </Field>
            </div>
            {duplicateYear && (
              <p role="status" className="flex items-center gap-1.5 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Tahun ini sudah ada di era ini
              </p>
            )}
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetYearForm}>Batal</Button>
            <Button type="submit" form="year-form" className={primaryButtonClass} disabled={savingYear}>
              {savingYear ? 'Menyimpan...' : editingYearId ? 'Update Tahun' : 'Tambah Tahun'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------- Tombol aksi ikon */

function IconAction({ label, onClick, destructive = false, children }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        destructive
          ? 'relative z-10 h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          : 'relative z-10 h-8 w-8 text-muted-foreground hover:bg-accent hover:text-foreground'
      }
    >
      {children}
    </Button>
  );
}

/* --------------------------------------------------------------- Era grid */

function EraGrid({ eras, onSelect, onEdit, onDelete }) {
  return (
    <div className="grid grid-cols-1 gap-4 duration-500 animate-in fade-in slide-in-from-bottom-2 sm:grid-cols-2 lg:grid-cols-3">
      {eras.map((era) => {
        const accent = getEraAccent(era.slug).hex;
        return (
          <div
            key={era.id}
            className="group relative flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${accent}1f`, color: accent }}
                aria-hidden="true"
              >
                <Landmark className="h-5 w-5" />
              </div>
              {/* Aksi selalu terlihat. `relative z-10` supaya berada di atas
                  area klik utama kartu (lihat tombol di bawah). */}
              <div className="-mr-1.5 -mt-1.5 flex gap-0.5">
                <IconAction label={`Edit era ${era.name}`} onClick={() => onEdit(era)}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconAction>
                <IconAction label={`Hapus era ${era.name}`} onClick={() => onDelete(era)} destructive>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconAction>
              </div>
            </div>

            {/* Area klik utama: tombol sungguhan, dibentangkan menutupi seluruh
                kartu lewat ::after (pola "stretched link"). */}
            <button
              type="button"
              onClick={() => onSelect(era)}
              className="mb-5 mt-4 block min-w-0 text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
            >
              {/* Ukuran isi dibuat tetap supaya semua kartu identik walau
                  panjang teksnya beda: judul 1 baris (dipotong, lengkapnya
                  ada di tooltip), deskripsi selalu memesan tempat 2 baris. */}
              <h3 className="truncate text-xl font-semibold leading-7 tracking-tight" title={era.name}>
                {era.name}
              </h3>
              <p
                className={
                  era.description
                    ? 'mt-1.5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground'
                    : 'mt-1.5 min-h-10 text-sm italic leading-5 text-muted-foreground/60'
                }
              >
                {era.description || 'Belum ada deskripsi.'}
              </p>
            </button>

            {/* mt-auto: footer selalu menempel di dasar kartu. */}
            <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Badge variant="secondary">Urutan {era.order}</Badge>
                <span>{era.years_count ?? '\u2014'} tahun</span>
              </span>
              <ChevronRight
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- Year timeline */

function YearTimeline({ years, accent, onEdit, onDelete }) {
  return (
    <ol className="relative ml-1.5 border-l">
      {years.map((y) => (
        <li key={y.id} className="relative pb-3 pl-7 last:pb-0">
          {/* Titik pada garis waktu; ring seukuran latar memotong garis. */}
          <span
            className="absolute -left-[5px] h-2.5 w-2.5 rounded-full ring-4 ring-background"
            style={{ backgroundColor: accent, top: 'calc(2.25rem - 5px)' }}
            aria-hidden="true"
          />
          {/* h-[4.5rem] = tinggi tetap untuk semua baris (pas untuk judul
              2 baris + padding), jadi baris berjudul pendek tidak lebih
              pendek dari yang panjang. Judul lebih dari 2 baris dipotong;
              lengkapnya ada di tooltip. */}
          <div className="flex h-[4.5rem] items-center gap-3 rounded-xl border bg-card px-4 shadow-sm">
            <span className="w-14 shrink-0 text-lg font-semibold tabular-nums">{y.year}</span>
            <span className="line-clamp-2 min-w-0 flex-1 font-medium leading-6" title={y.title}>
              {y.title}
            </span>
            <div className="flex shrink-0 gap-0.5">
              <IconAction label={`Edit tahun ${y.year}`} onClick={() => onEdit(y)}>
                <Pencil className="h-3.5 w-3.5" />
              </IconAction>
              <IconAction label={`Hapus tahun ${y.year}`} onClick={() => onDelete(y)} destructive>
                <Trash2 className="h-3.5 w-3.5" />
              </IconAction>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}