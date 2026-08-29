import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, ArrowLeft } from "lucide-react";
import apiClient from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ERA_ACCENTS } from "@/config/branding";

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

  useEffect(() => {
    apiClient.get("/admin/eras").then(({ data }) => setEras(data));
  }, []);

  async function openEra(era) {
    setActiveEra(era);
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
          <YearGrid
            era={activeEra}
            years={years}
            loading={loadingYears}
            onSelect={(y) => navigate(`/studio/${y.id}`)}
            onCreate={createYear}
          />
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Era grid */

function EraGrid({ eras, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {eras.map((era) => {
        const accent = ERA_ACCENTS?.[era.slug]?.hex ?? "#0C0C0C";
        return (
          <button
            key={era.id}
            onClick={() => onSelect(era)}
            className="group flex flex-col justify-between rounded-2xl border border-zinc-100 p-5 text-left transition hover:shadow-md"
          >
            <div>
              <span
                className="mb-3 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <h3 className="text-base font-semibold text-zinc-900">{era.name}</h3>
              {era.description && (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{era.description}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>{era.years_count ?? "—"} tahun</span>
              <ChevronRight size={16} className="text-zinc-300 transition group-hover:translate-x-0.5" />
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
  const accent = ERA_ACCENTS?.[era.slug]?.hex ?? "#0C0C0C";

  async function submit(e) {
    e.preventDefault();
    if (!form.year || !form.title) return;
    setSubmitting(true);
    try {
      await onCreate({ year: Number(form.year), title: form.title });
    } catch (err) {
      alert(err?.response?.data?.message ?? "Gagal membuat tahun baru");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="text-base font-semibold text-zinc-900">{era.name}</h2>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat tahun…</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {years.map((y) => (
            <button
              key={y.id}
              onClick={() => onSelect(y)}
              className="flex flex-col items-start gap-1 rounded-xl border border-zinc-100 p-4 text-left transition hover:shadow-md"
            >
              <span className="text-xs font-medium text-zinc-400">{y.year}</span>
              <span className="line-clamp-2 text-sm font-medium text-zinc-900">{y.title}</span>
              <div className="mt-2 flex gap-1">
                {y.quiz?.is_published && <Badge variant="success">Kuis siap</Badge>}
                {!y.summary && <Badge variant="secondary">Rangkuman kosong</Badge>}
              </div>
            </button>
          ))}

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-200 p-4 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600"
            >
              <Plus size={18} />
              <span className="text-xs">Tambah Tahun Baru</span>
            </button>
          ) : (
            <form
              onSubmit={submit}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3"
            >
              <Input
                type="number"
                placeholder="Tahun, mis. 1918"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                autoFocus
              />
              <Input
                placeholder="Judul wabah"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={submitting} style={{ backgroundColor: accent }}>
                  {submitting ? "Membuat…" : "Buat & Buka"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}