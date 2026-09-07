import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, ArrowLeft } from "lucide-react";
import apiClient from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ERA_ACCENTS } from "@/config/branding";
import EraQuizManager from "@/pages/EraQuizManager";

/**
 * Class Tailwind solid per era untuk card di EraGrid (Design.md — mockup
 * "Informasi Sejarah": card Kolonial/Kemerdekaan/Modern full-color, bukan
 * cuma dot aksen). Ditulis statis (bukan template string dinamis) supaya
 * class-nya ke-detect Tailwind JIT scanner.
 */
const ERA_CARD_STYLES = {
  kolonial: "bg-warning text-warning-foreground",
  kemerdekaan: "bg-success text-success-foreground",
  modern: "bg-info text-info-foreground",
};
const DEFAULT_ERA_CARD_STYLE = "bg-primary text-primary-foreground";

/**
 * Entry point Content Studio (Design.md §4.1):
 *   Pilih Era (grid card) -> Pilih Tahun (grid card + quick-create inline)
 *   -> submit tahun baru langsung masuk ke WabahWorkspace tahun tsb.
 *
 * Routing: /studio (step ini) -> /studio/:yearId (WabahWorkspace)
 */
export default function StudioEraYearPicker() {
  const navigate = useNavigate();
  const [eras, setEras] = useState(null);
  const [activeEra, setActiveEra] = useState(null); // era yang lagi di-expand
  const [years, setYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(false);
  // Tab level Era (BUKAN level Year seperti tab di WabahWorkspace) — "years"
  // = grid Tahun (default), "quiz" = EraQuizManager (kuis sumatif "final
  // boss" era ini, Rules.md R-ERAQUIZ). Direset tiap ganti era (lihat openEra).
  const [eraTab, setEraTab] = useState("years");

  useEffect(() => {
    apiClient.get("/admin/eras").then(({ data }) => setEras(data));
  }, []);

  async function openEra(era) {
    setActiveEra(era);
    setEraTab("years");
    setLoadingYears(true);
    // TODO verifikasi: asumsi endpoint mendukung filter `?era_id=`, konsisten
    // dengan pola filter di AdminSectionController (`?year_id=`).
    const { data } = await apiClient.get(`/admin/years`, { params: { era_id: era.id } });
    setYears(data.sort((a, b) => a.year - b.year));
    setLoadingYears(false);
  }

  function backToEraGrid() {
    setActiveEra(null);
    setYears([]);
  }

  async function createYear({ year, title }) {
    const { data: newYear } = await apiClient.post("/admin/years", {
      era_id: activeEra.id,
      year,
      title,
    });
    // submit langsung masuk ke Workspace Wabah tahun baru tsb (Design.md §4.1)
    navigate(`/studio/${newYear.id}`);
  }

  if (!eras) {
    return <div className="p-8 text-sm text-zinc-400">Memuat era…</div>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-1 text-xl font-semibold text-zinc-900">Content Studio</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {activeEra ? "Pilih atau buat tahun untuk mulai mengisi konten wabah." : "Pilih masa untuk melihat tahun-tahun di dalamnya."}
      </p>

      {!activeEra ? (
        <EraGrid eras={eras} onSelect={openEra} />
      ) : (
        <div>
          <button
            onClick={backToEraGrid}
            className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
          >
            <ArrowLeft size={14} /> Kembali ke pilih masa
          </button>

          {/* Tab switcher level Era (Design.md, revisi Content Studio):
              "Tahun" = grid tahun seperti sebelumnya, "Kuis Sumatif Era" =
              EraQuizManager, dikelola sebagai tab di sini (bukan halaman
              terpisah) supaya admin tidak perlu keluar dari Content Studio. */}
          <div className="mb-4 flex gap-1 border-b border-zinc-100">
            <EraTabButton active={eraTab === "years"} onClick={() => setEraTab("years")}>
              Tahun
            </EraTabButton>
            <EraTabButton active={eraTab === "quiz"} onClick={() => setEraTab("quiz")}>
              Kuis Sumatif Era
            </EraTabButton>
          </div>

          {eraTab === "years" ? (
            <YearGrid
              era={activeEra}
              years={years}
              loading={loadingYears}
              onSelect={(y) => navigate(`/studio/${y.id}`)}
              onCreate={createYear}
            />
          ) : (
            <EraQuizManager era={activeEra} />
          )}
        </div>
      )}
    </div>
  );
}

function EraTabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-zinc-900 text-zinc-900"
          : "border-transparent text-zinc-400 hover:text-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- Era grid */

function EraGrid({ eras, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {eras.map((era) => {
        const cardStyle = ERA_CARD_STYLES[era.slug] ?? DEFAULT_ERA_CARD_STYLE;
        return (
          <button
            key={era.id}
            onClick={() => onSelect(era)}
            className={`group flex flex-col justify-between rounded-2xl p-5 text-left shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${cardStyle}`}
          >
            <div>
              <h3 className="text-base font-semibold">{era.name}</h3>
              {era.description && (
                <p className="mt-1 line-clamp-2 text-xs opacity-80">{era.description}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs opacity-80">
              <span>{era.years_count ?? "—"} tahun</span>
              <ChevronRight size={16} className="transition group-hover:translate-x-0.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Year grid */

function YearGrid({ era, years, loading, onSelect, onCreate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ year: "", title: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const accent = ERA_ACCENTS?.[era.slug]?.hex ?? "#0C0C0C";

  function openForm() {
    setForm({ year: "", title: "" });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError(null);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.year || !form.title) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate({ year: Number(form.year), title: form.title });
      // navigate ke workspace terjadi di onCreate (App.jsx/StudioEraYearPicker
      // induk) — dialog tidak perlu ditutup manual karena komponen ini
      // akan unmount begitu route berpindah.
    } catch (err) {
      setFormError(err?.response?.data?.message ?? "Gagal membuat tahun baru");
      setSubmitting(false);
    }
  }

  const yearAlreadyExists = form.year && years.some((y) => y.year === Number(form.year));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <h2 className="text-base font-semibold text-zinc-900">{era.name}</h2>
        </div>
        <Button size="sm" onClick={openForm} style={{ backgroundColor: accent }} className="text-white hover:opacity-90">
          <Plus size={16} /> Tambah Tahun Baru
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat tahun…</p>
      ) : years.length === 0 ? (
        <button
          onClick={openForm}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-200 p-8 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600"
        >
          <Plus size={18} />
          <span className="text-xs">Belum ada tahun di era ini — klik untuk tambah</span>
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {years.map((y) => (
            <button
              key={y.id}
              onClick={() => onSelect(y)}
              className="flex flex-col items-start gap-1 rounded-xl border border-l-4 border-zinc-100 p-4 text-left transition hover:shadow-md"
              style={{ borderLeftColor: accent }}
            >
              <span className="text-xs font-medium text-zinc-400">{y.year}</span>
              <span className="line-clamp-2 text-sm font-medium text-zinc-900">{y.title}</span>
              <div className="mt-2 flex gap-1">
                {y.quiz?.is_published && <Badge variant="success">Kuis siap</Badge>}
                {!y.summary && <Badge variant="secondary">Rangkuman kosong</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              Tahun Baru — {era.name}
            </DialogTitle>
            <DialogDescription>
              Submit langsung membuka Workspace Wabah untuk tahun ini.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
          )}

          <form id="quick-create-year-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tahun</Label>
              <Input
                type="number"
                placeholder="mis. 1918"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                autoFocus
                required
              />
              {yearAlreadyExists && (
                <p className="text-xs text-warning">⚠ Tahun ini sudah pernah diinput sebelumnya</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Judul Wabah</Label>
              <Input
                placeholder="mis. Wabah Flu Spanyol"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
            <Button
              type="submit"
              form="quick-create-year-form"
              disabled={submitting}
              style={{ backgroundColor: accent }}
              className="text-white hover:opacity-90"
            >
              {submitting ? "Membuat…" : "Buat & Buka"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}