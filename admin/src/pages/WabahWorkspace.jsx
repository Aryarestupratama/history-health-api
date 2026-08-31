import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import apiClient from "@/api"; // axios instance dgn interceptor token Sanctum
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConfirm } from "@/components/confirm-dialog";
import PhonePreview from "@/components/PhonePreview";
import { ERA_ACCENTS } from "@/config/branding";

const TABS = [
  { key: "section", label: "Section & Blok" },
  { key: "summary", label: "Rangkuman & Vaksin" },
  { key: "quiz", label: "Kuis" },
];

export default function WabahWorkspace() {
  const { yearId } = useParams();
  const { confirm: confirmDialog, dialog } = useConfirm();

  const [year, setYear] = useState(null); // { id, year, title, summary, era: {slug,name}, sections: [], vaccines: [], quiz: {...} }
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("section");

  // state khusus per tab, disinkronkan ke PhonePreview secara live
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Status simpan per tab ("idle" | "dirty" | "saving" | "saved" | "error").
  // Dipakai HANYA untuk tombol Simpan (enable/disable + label) di masing-masing
  // tab -- bukan indikator "belum disimpan" per field (lihat state di bawah).
  const [tabStatus, setTabStatus] = useState({ section: "idle", summary: "idle", quiz: "idle" });
  // Pesan error per tab -- pengganti alert() browser, ditampilkan sebagai
  // <Alert> di atas konten tab aktif, konsisten dengan AdminManager/
  // VaccineManager/EraYearManager.
  const [tabError, setTabError] = useState({ section: null, summary: null, quiz: null });

  function setStatusFor(tabKey, status) {
    setTabStatus((prev) => ({ ...prev, [tabKey]: status }));
  }

  function setErrorFor(tabKey, message) {
    setTabError((prev) => ({ ...prev, [tabKey]: message }));
  }

  // ------------------------------------------------------------------
  // Field-level dirty tracking -- SENGAJA dinaikkan ke level workspace
  // (bukan local state di masing-masing komponen Tab). Alasan: render di
  // bawah cuma me-mount 1 komponen tab yang aktif, jadi kalau state dirty
  // ini disimpan di dalam komponen Tab itu sendiri, pindah tab akan
  // meng-unmount komponennya dan menghapus state tsb -- padahal datanya
  // di `year` masih belum benar-benar tersimpan ke backend. Akibatnya
  // badge "belum disimpan" akan salah/hilang begitu admin balik lagi ke
  // tab tsb, walau perubahannya sebenarnya masih pending.
  //
  // - sectionTitleDirty: Set<sectionId>  -- section mana yang judulnya berubah
  // - sectionBlockDirty: Set<blockId>    -- blok konten mana yang isinya berubah
  // - summaryDirty / vaccinesDirty: boolean, independen satu sama lain
  // - quizFieldDirty: Map<questionId, Set<fieldName>>
  const [sectionTitleDirty, setSectionTitleDirty] = useState(new Set());
  const [sectionBlockDirty, setSectionBlockDirty] = useState(new Set());
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [vaccinesDirty, setVaccinesDirty] = useState(false);
  const [quizFieldDirty, setQuizFieldDirty] = useState(new Map());

  const hasAnyUnsaved =
    sectionTitleDirty.size > 0 ||
    sectionBlockDirty.size > 0 ||
    summaryDirty ||
    vaccinesDirty ||
    quizFieldDirty.size > 0;

  function resetAllDirty() {
    setSectionTitleDirty(new Set());
    setSectionBlockDirty(new Set());
    setSummaryDirty(false);
    setVaccinesDirty(false);
    setQuizFieldDirty(new Map());
  }

  // Dipanggil dari mana pun yang mau berpindah keluar workspace ini
  // (breadcrumb ganti tahun/era) -- true berarti boleh lanjut.
  async function confirmDiscardIfUnsaved(message) {
    if (!hasAnyUnsaved) return true;
    return confirmDialog({
      title: "Ada perubahan belum disimpan",
      description: message ?? "Ada perubahan yang belum disimpan di workspace ini. Tetap pindah dan buang perubahan?",
    });
  }

  useEffect(() => {
    loadYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

  // Peringatan browser native saat admin coba menutup/reload tab sementara
  // ada perubahan belum disimpan (di luar jangkauan konfirmasi in-app).
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!hasAnyUnsaved) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasAnyUnsaved]);

  // YearController::show() cuma eager-load sections/vaccines/quiz (tanpa nested
  // contentBlocks/questions.options) — fetch content_blocks terpisah saat
  // section dipilih dan belum pernah dimuat.
  useEffect(() => {
    if (!year || activeSectionId == null) return;
    const section = year.sections.find((s) => s.id === activeSectionId);
    if (!section || section.content_blocks !== undefined) return;

    apiClient.get(`/admin/sections/${activeSectionId}/content-blocks`).then(({ data }) => {
      setYear((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === activeSectionId ? { ...s, content_blocks: data } : s)),
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, activeSectionId]);

  async function loadYear() {
    setLoading(true);
    const { data } = await apiClient.get(`/admin/years/${yearId}`);
    setYear(data);
    setActiveSectionId(data.sections?.[0]?.id ?? null);
    setTabStatus({ section: "idle", summary: "idle", quiz: "idle" });
    resetAllDirty();
    setLoading(false);
  }

  const eraAccent = ERA_ACCENTS?.[year?.era?.slug]?.hex;

  // Section aktif dianggap "punya perubahan belum disimpan" kalau judulnya
  // ada di sectionTitleDirty ATAU salah satu bloknya ada di sectionBlockDirty.
  function isSectionDirty(sectionId) {
    if (sectionTitleDirty.has(sectionId)) return true;
    const section = year?.sections?.find((s) => s.id === sectionId);
    return (section?.content_blocks ?? []).some((b) => sectionBlockDirty.has(b.id));
  }

  async function selectSection(id) {
    if (id === activeSectionId) return;
    if (
      isSectionDirty(activeSectionId) &&
      !(await confirmDialog({
        title: "Ada perubahan belum disimpan",
        description: "Ada perubahan di section ini yang belum disimpan. Pindah section dan buang perubahan?",
      }))
    ) {
      return;
    }
    setStatusFor("section", "idle");
    setActiveSectionId(id);
  }

  const previewProps = useMemo(() => {
    if (!year) return { screen: null, data: null };

    if (activeTab === "section") {
      const activeSection = year.sections?.find((s) => s.id === activeSectionId);
      if (activeSection) {
        return {
          screen: "section-detail",
          data: {
            sectionTitle: activeSection.title,
            blocks: activeSection.content_blocks ?? [],
          },
        };
      }
      return {
        screen: "roadmap",
        data: {
          yearTitle: year.title,
          yearNumber: year.year,
          activeId: activeSectionId,
          sections: (year.sections ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            order: s.order,
            isPublished: s.is_published,
            locked: false, // admin selalu bisa akses (R-SECT-05), preview tunjukkan urutan saja
          })),
        },
      };
    }

    if (activeTab === "summary") {
      return {
        screen: "summary",
        data: {
          summary: year.summary,
          vaccines: year.vaccines ?? [],
          showUnlockAnimation: (year.vaccines ?? []).length > 0,
        },
      };
    }

    if (activeTab === "quiz") {
      const questions = year.quiz?.questions ?? [];
      return {
        screen: "quiz",
        data: {
          // Semua soal dikirim sekaligus (bukan cuma soal aktif) — preview
          // HP menampilkan seluruh soal berurutan dalam 1 layar scrollable,
          // selaras rencana model Flutter (form kuis in-app juga scrollable
          // semua soal, bukan swipe per-soal). activeIndex tetap dikirim
          // supaya preview bisa highlight soal yang sedang diedit di editor.
          questions,
          activeIndex: activeQuestionIndex,
        },
      };
    }

    return { screen: null, data: null };
  }, [year, activeTab, activeSectionId, activeQuestionIndex]);

  if (loading || !year) {
    return <div className="p-8 text-sm text-zinc-400">Memuat workspace…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {dialog}
      <Breadcrumb year={year} confirmDiscardIfUnsaved={confirmDiscardIfUnsaved} />

      <div className="flex border-b border-zinc-100 px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition ${
              activeTab === t.key ? "" : "text-zinc-400 hover:text-zinc-600"
            }`}
            style={activeTab === t.key ? { color: eraAccent } : undefined}
          >
            {t.label}
            {activeTab === t.key && (
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                style={{ backgroundColor: eraAccent }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-[65%_35%] overflow-hidden">
        <div className="overflow-y-auto p-6">
          {tabError[activeTab] && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{tabError[activeTab]}</AlertDescription>
            </Alert>
          )}
          {activeTab === "section" && (
            <SectionBlokTab
              year={year}
              setYear={setYear}
              activeSectionId={activeSectionId}
              setActiveSectionId={selectSection}
              eraAccent={eraAccent}
              status={tabStatus.section}
              setStatus={(s) => setStatusFor("section", s)}
              setError={(m) => setErrorFor("section", m)}
              confirmDialog={confirmDialog}
              titleDirty={sectionTitleDirty}
              setTitleDirty={setSectionTitleDirty}
              blockDirty={sectionBlockDirty}
              setBlockDirty={setSectionBlockDirty}
            />
          )}
          {activeTab === "summary" && (
            <SummaryVaccineTab
              year={year}
              setYear={setYear}
              status={tabStatus.summary}
              setStatus={(s) => setStatusFor("summary", s)}
              setError={(m) => setErrorFor("summary", m)}
              summaryDirty={summaryDirty}
              setSummaryDirty={setSummaryDirty}
              vaccinesDirty={vaccinesDirty}
              setVaccinesDirty={setVaccinesDirty}
            />
          )}
          {activeTab === "quiz" && (
            <QuizTab
              year={year}
              setYear={setYear}
              activeQuestionIndex={activeQuestionIndex}
              setActiveQuestionIndex={setActiveQuestionIndex}
              status={tabStatus.quiz}
              setStatus={(s) => setStatusFor("quiz", s)}
              setError={(m) => setErrorFor("quiz", m)}
              dirtyFields={quizFieldDirty}
              setDirtyFields={setQuizFieldDirty}
            />
          )}
        </div>

        <div className="flex items-start justify-center border-l border-zinc-100 bg-zinc-50/50 p-6">
          <PhonePreview screen={previewProps.screen} data={previewProps.data} eraSlug={year.era?.slug} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- Breadcrumb */

function Breadcrumb({ year, confirmDiscardIfUnsaved }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [siblingYears, setSiblingYears] = useState(null);
  const eraAccent = ERA_ACCENTS?.[year?.era?.slug]?.hex ?? "#0C0C0C";

  async function toggle() {
    if (!open && !siblingYears) {
      const { data } = await apiClient.get(`/admin/years`, { params: { era_id: year.era?.id } });
      setSiblingYears(data.sort((a, b) => a.year - b.year));
    }
    setOpen((o) => !o);
  }

  function goToStudioPicker() {
    if (
      !confirmDiscardIfUnsaved(
        "Ada perubahan yang belum disimpan di tahun ini. Ganti masa (era) dan buang perubahan?"
      )
    )
      return;
    navigate("/studio");
  }

  function goToYear(y) {
    if (y.id === year.id) {
      setOpen(false);
      return;
    }
    if (
      !confirmDiscardIfUnsaved("Ada perubahan yang belum disimpan di tahun ini. Ganti tahun dan buang perubahan?")
    )
      return;
    setOpen(false);
    navigate(`/studio/${y.id}`);
  }

  return (
    <div className="relative px-6 pb-3 pt-5">
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: eraAccent }} />
        <span>{year.era?.name}</span>
        <span className="text-zinc-300">/</span>
        <span className="font-medium text-zinc-900">
          {year.year} — {year.title}
        </span>
        <span className="ml-1 text-zinc-300">▾</span>
      </button>

      {open && (
        <div className="absolute left-6 top-full z-20 mt-1 w-64 rounded-xl border border-zinc-100 bg-white p-2 shadow-lg">
          <button
            onClick={goToStudioPicker}
            className="mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-50"
          >
            ← Ganti masa (era) lain
          </button>
          {(siblingYears ?? []).map((y) => (
            <button
              key={y.id}
              onClick={() => goToYear(y)}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                y.id === year.id ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {y.year} — {y.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- SaveButton */
// Tombol Simpan generik dipakai di ketiga tab, styling & label mengikuti
// status ("idle" | "dirty" | "saving" | "saved" | "error") supaya admin
// selalu tahu kapan perubahan benar-benar terkirim ke backend.

function SaveButton({ status, onClick }) {
  const config =
    {
      idle: { label: "Simpan", variant: "outline" },
      dirty: { label: "Simpan", variant: "default" },
      saving: { label: "Menyimpan…", variant: "default" },
      saved: { label: "Tersimpan", variant: "outline" },
      error: { label: "Gagal, coba lagi", variant: "destructive" },
    }[status] ?? { label: "Simpan", variant: "outline" };

  return (
    <Button size="sm" variant={config.variant} onClick={onClick} disabled={status === "saving"}>
      <Save size={12} /> {config.label}
    </Button>
  );
}

/* ------------------------------------------------------ UnsavedFieldBadge */
// Indikator kecil "Belum disimpan" yang ditempel LANGSUNG di sebelah field
// yang perubahannya belum terkirim ke backend -- pengganti dot generik di
// tab bar. Dipakai konsisten di ketiga tab supaya admin tahu persis field
// mana yang masih pending, bukan cuma "ada sesuatu yang berubah di tab ini".
function UnsavedFieldBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
      Belum disimpan
    </span>
  );
}

/* -------------------------------------------------------- Tab: Section & Blok */

function SectionBlokTab({
  year,
  setYear,
  activeSectionId,
  setActiveSectionId,
  eraAccent,
  status,
  setStatus,
  titleDirty,
  setTitleDirty,
  blockDirty,
  setBlockDirty,
}) {
  const activeSection = year.sections?.find((s) => s.id === activeSectionId);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const orderedSections = (year.sections ?? []).slice().sort((a, b) => a.order - b.order);

  function isSectionDirty(sectionId) {
    if (titleDirty.has(sectionId)) return true;
    const section = year.sections.find((s) => s.id === sectionId);
    return (section?.content_blocks ?? []).some((b) => blockDirty.has(b.id));
  }

  const activeSectionDirty = activeSectionId != null && isSectionDirty(activeSectionId);

  function handleDrop(targetId) {
    if (dragId == null || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const list = orderedSections.slice();
    const fromIdx = list.findIndex((s) => s.id === dragId);
    const toIdx = list.findIndex((s) => s.id === targetId);
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    // re-assign `order` sesuai posisi baru, lalu persist ke backend (R-SECT-01)
    // -- ini aksi diskrit (drag-drop), bukan field ketikan, jadi tetap
    // langsung tersimpan seperti semula (tidak ikut tombol Simpan).
    const reindexed = list.map((s, i) => ({ ...s, order: i + 1 }));
    reorderSections(reindexed);
    setDragId(null);
    setDragOverId(null);
  }

  async function addSection() {
    // apiResource('sections') -> store langsung di /admin/sections, year_id di body
    const { data: newSection } = await apiClient.post(`/admin/sections`, {
      year_id: year.id,
      title: "Section baru",
    });
    setYear({ ...year, sections: [...(year.sections ?? []), newSection] });
    setActiveSectionId(newSection.id);
  }

  async function reorderSections(orderedSections) {
    // optimistic: update urutan lokal dulu (dipakai juga oleh drag-drop)
    setYear({ ...year, sections: orderedSections });
    const { data: freshSections } = await apiClient.put(`/admin/years/${year.id}/sections/reorder`, {
      section_ids: orderedSections.map((s) => s.id),
    });
    // response reorder() tidak include content_blocks — merge, jangan overwrite mentah
    setYear((prev) => ({
      ...prev,
      sections: freshSections.map((fresh) => {
        const existing = prev.sections.find((s) => s.id === fresh.id);
        return { ...fresh, content_blocks: existing?.content_blocks };
      }),
    }));
  }

  // Judul section sekarang cuma diubah di state lokal saat mengetik --
  // dikirim ke backend hanya saat admin klik tombol Simpan
  // (handleSaveSection), bukan lagi PUT di setiap keystroke.
  function editSectionTitle(id, title) {
    setYear({
      ...year,
      sections: year.sections.map((s) => (s.id === id ? { ...s, title } : s)),
    });
    setTitleDirty((prev) => new Set(prev).add(id));
    setStatus("dirty");
  }

  async function togglePublish(section) {
    try {
      const { data } = await apiClient.put(`/admin/sections/${section.id}`, {
        is_published: !section.is_published,
      });
      setYear({
        ...year,
        sections: year.sections.map((s) => (s.id === section.id ? { ...s, ...data } : s)),
      });
    } catch (e) {
      alert(e?.response?.data?.message ?? "Gagal ubah status publish");
    }
  }

  async function deleteSection(id) {
    if (!confirm("Hapus section ini beserta seluruh bloknya?")) return;
    await apiClient.delete(`/admin/sections/${id}`);
    const rest = year.sections.filter((s) => s.id !== id);
    setYear({ ...year, sections: rest });
    setActiveSectionId(rest[0]?.id ?? null);
    setTitleDirty((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function markBlockDirty(blockId) {
    setBlockDirty((prev) => new Set(prev).add(blockId));
    setStatus("dirty");
  }

  async function handleSaveSection() {
    if (!activeSection) return;
    setStatus("saving");
    try {
      if (titleDirty.has(activeSection.id)) {
        await apiClient.put(`/admin/sections/${activeSection.id}`, { title: activeSection.title });
      }

      const blocksToSave = (activeSection.content_blocks ?? []).filter((b) => blockDirty.has(b.id));
      const updatedBlocks = await Promise.all(
        blocksToSave.map((b) =>
          apiClient
            .patch(`/admin/sections/${activeSection.id}/content-blocks/${b.id}`, { content: b.content })
            .then(({ data }) => data)
        )
      );

      setYear((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== activeSection.id) return s;
          const merged = (s.content_blocks ?? []).map(
            (b) => updatedBlocks.find((u) => u.id === b.id) ?? b
          );
          return { ...s, content_blocks: merged };
        }),
      }));
      setTitleDirty((prev) => {
        const next = new Set(prev);
        next.delete(activeSection.id);
        return next;
      });
      setBlockDirty((prev) => {
        const next = new Set(prev);
        blocksToSave.forEach((b) => next.delete(b.id));
        return next;
      });
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      alert(e?.response?.data?.message ?? "Gagal menyimpan section.");
    }
  }

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6">
      {/* Sidebar list section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Section</p>
          <Button size="icon" variant="ghost" onClick={addSection}>
            <Plus size={16} />
          </Button>
        </div>
        <ul className="space-y-1">
          {orderedSections.map((s) => (
            <li
              key={s.id}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverId !== s.id) setDragOverId(s.id);
              }}
              onDragLeave={() => setDragOverId((cur) => (cur === s.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(s.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm transition ${
                activeSectionId === s.id ? "border-zinc-900 bg-zinc-50" : "border-transparent hover:bg-zinc-50"
              } ${dragOverId === s.id && dragId !== s.id ? "border-dashed" : ""} ${
                dragId === s.id ? "opacity-40" : ""
              }`}
            >
              <GripVertical size={14} className="shrink-0 cursor-grab text-zinc-300 active:cursor-grabbing" />
              <button
                onClick={() => setActiveSectionId(s.id)}
                className="flex-1 truncate text-left"
                title={s.title}
              >
                {s.title}
              </button>
              {isSectionDirty(s.id) && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400"
                  title="Ada field belum disimpan di section ini"
                />
              )}
              <Badge variant={s.is_published ? "default" : "secondary"} className="shrink-0 text-[10px]">
                {s.is_published ? "Published" : "Draft"}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* Editor section aktif */}
      <div className="space-y-4">
        {!activeSection ? (
          <EmptyPanel text="Belum ada section. Tambahkan section baru di sidebar kiri." />
        ) : (
          <>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Judul Section</p>
                {titleDirty.has(activeSection.id) && <UnsavedFieldBadge />}
              </div>
              <Input
                value={activeSection.title}
                onChange={(e) => editSectionTitle(activeSection.id, e.target.value)}
                placeholder="Judul section…"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Blok Konten
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePublish(activeSection)}>
                  {activeSection.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSection(activeSection.id)}>
                  <Trash2 size={14} className="text-red-500" /> Hapus section
                </Button>
              </div>
            </div>

            <ContentBlockEditor
              section={activeSection}
              blocks={activeSection.content_blocks ?? []}
              dirtyBlockIds={blockDirty}
              markDirty={markBlockDirty}
              onChange={(blocks) =>
                setYear({
                  ...year,
                  sections: year.sections.map((s) =>
                    s.id === activeSection.id ? { ...s, content_blocks: blocks } : s
                  ),
                })
              }
            />

            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
              {activeSectionDirty && (
                <span className="mr-auto text-[11px] text-zinc-400">
                  Ada perubahan belum disimpan di section ini
                </span>
              )}
              <SaveButton status={status} onClick={handleSaveSection} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------- ContentBlockEditor */

function ContentBlockEditor({ section, blocks, dirtyBlockIds, markDirty, onChange }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const orderedBlocks = (blocks ?? []).slice().sort((a, b) => a.order - b.order);

  async function addBlock(type) {
    const { data } = await apiClient.post(`/admin/sections/${section.id}/content-blocks`, {
      type,
      content: "",
    });
    onChange([...blocks, data]);
  }

  // Isi blok sekarang cuma diubah di state lokal saat mengetik -- dikirim
  // ke backend saat admin klik tombol Simpan (lihat
  // SectionBlokTab::handleSaveSection), bukan lagi PATCH di setiap keystroke.
  function updateBlock(id, content) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
    markDirty?.(id);
  }

  async function removeBlock(id) {
    await apiClient.delete(`/admin/sections/${section.id}/content-blocks/${id}`);
    onChange(blocks.filter((b) => b.id !== id));
  }

  async function reorderBlocks(newOrderedBlocks) {
    onChange(newOrderedBlocks);
    await apiClient.post(`/admin/sections/${section.id}/content-blocks/reorder`, {
      block_ids: newOrderedBlocks.map((b) => b.id),
    });
  }

  function handleDrop(targetId) {
    if (dragId == null || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const list = orderedBlocks.slice();
    const fromIdx = list.findIndex((b) => b.id === dragId);
    const toIdx = list.findIndex((b) => b.id === targetId);
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    reorderBlocks(list.map((b, i) => ({ ...b, order: i + 1 })));
    setDragId(null);
    setDragOverId(null);
  }

  return (
    <div className="space-y-3">
      {orderedBlocks.map((b) => {
        const isDirty = dirtyBlockIds?.has(b.id);
        return (
          <div
            key={b.id}
            draggable
            onDragStart={() => setDragId(b.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverId !== b.id) setDragOverId(b.id);
            }}
            onDragLeave={() => setDragOverId((cur) => (cur === b.id ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(b.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
            className={`rounded-lg border p-3 transition ${
              isDirty ? "border-orange-300" : "border-zinc-100"
            } ${dragOverId === b.id && dragId !== b.id ? "border-zinc-900" : ""} ${
              dragId === b.id ? "opacity-40" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing">
                <GripVertical size={14} className="text-zinc-300" />
                <Badge variant="secondary">{b.type}</Badge>
                {isDirty && <UnsavedFieldBadge />}
              </span>
              <Button variant="ghost" size="icon" onClick={() => removeBlock(b.id)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>
            {b.type === "text" ? (
              <Textarea
                defaultValue={b.content}
                placeholder="Tulis teks konten…"
                onChange={(e) => updateBlock(b.id, e.target.value)}
              />
            ) : (
              <Input
                defaultValue={b.content}
                placeholder={b.type === "video" ? "Link YouTube (unlisted)" : "Link Google Drive"}
                onChange={(e) => updateBlock(b.id, e.target.value)}
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2">
        {["text", "image", "video", "pdf"].map((t) => (
          <Button key={t} variant="outline" size="sm" onClick={() => addBlock(t)}>
            <Plus size={12} /> {t}
          </Button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Tab: Rangkuman & Vaksin */

function SummaryVaccineTab({
  year,
  setYear,
  status,
  setStatus,
  summaryDirty,
  setSummaryDirty,
  vaccinesDirty,
  setVaccinesDirty,
}) {
  const [allVaccines, setAllVaccines] = useState([]);

  useEffect(() => {
    apiClient.get("/admin/vaccines").then(({ data }) => setAllVaccines(data));
  }, []);

  function editSummary(summary) {
    setYear({ ...year, summary });
    setSummaryDirty(true);
    setStatus("dirty");
  }

  function toggleVaccine(vaccine) {
    const selected = (year.vaccines ?? []).some((v) => v.id === vaccine.id);
    const nextVaccines = selected
      ? (year.vaccines ?? []).filter((v) => v.id !== vaccine.id)
      : [...(year.vaccines ?? []), vaccine];
    setYear({ ...year, vaccines: nextVaccines });
    setVaccinesDirty(true);
    setStatus("dirty");
  }

  async function handleSave() {
    setStatus("saving");
    try {
      if (summaryDirty) {
        await apiClient.put(`/admin/years/${year.id}`, { summary: year.summary });
      }
      if (vaccinesDirty) {
        const { data } = await apiClient.post(`/admin/years/${year.id}/assign-vaccines`, {
          vaccine_ids: (year.vaccines ?? []).map((v) => v.id),
        });
        setYear((prev) => ({ ...prev, vaccines: data.vaccines }));
      }
      setSummaryDirty(false);
      setVaccinesDirty(false);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      alert(e?.response?.data?.message ?? "Gagal menyimpan rangkuman/vaksin.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Rangkuman Wabah (years.summary)
          </p>
          {summaryDirty && <UnsavedFieldBadge />}
        </div>
        <Textarea
          rows={6}
          value={year.summary ?? ""}
          onChange={(e) => editSummary(e.target.value)}
          placeholder="Tulis rangkuman wabah ini…"
        />
        <p className="mt-1 text-[11px] text-zinc-400">
          Wajib terisi sebelum kuis bisa di-publish. Klik tombol Simpan di bawah untuk menyimpan
          perubahan rangkuman & vaksin sekaligus.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Vaksin Terkait</p>
          {vaccinesDirty && <UnsavedFieldBadge />}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {allVaccines.map((v) => {
            const checked = (year.vaccines ?? []).some((yv) => yv.id === v.id);
            return (
              <label
                key={v.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${
                  checked ? "border-zinc-900 bg-zinc-50" : "border-zinc-100"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleVaccine(v)} />
                {v.name}
              </label>
            );
          })}
          {allVaccines.length === 0 && (
            <p className="text-xs text-zinc-400">
              Belum ada data vaksin. Tambahkan dulu di halaman Kelola Vaksin.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
        <SaveButton status={status} onClick={handleSave} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Tab: Kuis */

function QuizTab({
  year,
  setYear,
  activeQuestionIndex,
  setActiveQuestionIndex,
  status,
  setStatus,
  dirtyFields,
  setDirtyFields,
}) {
  const quiz = year.quiz;
  const questions = quiz?.questions ?? [];

  const dirtyQuestionIds = new Set(dirtyFields.keys());

  // GET /admin/years/{year}/quiz — QuizController::show() firstOrCreate quiz
  // dan load('questions.options'). YearController::show() sendiri cuma load
  // relasi `quiz` shallow (tanpa questions/options), jadi meskipun year.quiz
  // sudah ada, tetap perlu fetch ulang yang lengkap kalau `questions` belum ada.
  useEffect(() => {
    if (!quiz || quiz.questions === undefined) {
      apiClient.get(`/admin/years/${year.id}/quiz`).then(({ data }) => {
        setYear((prev) => ({ ...prev, quiz: data }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz]);

  async function addQuestion() {
    if (!quiz) return;
    if (questions.length >= 5) return alert("Maksimal 5 soal per kuis (R-QUIZ-06)");
    const { data } = await apiClient.post(`/admin/quizzes/${quiz.id}/questions`, {
      question: "",
      options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }],
    });
    setYear({ ...year, quiz: { ...quiz, questions: [...questions, data] } });
    setActiveQuestionIndex(questions.length);
  }

  function markFieldDirty(questionId, fieldName) {
    setDirtyFields((prev) => {
      const next = new Map(prev);
      const fields = new Set(next.get(questionId) ?? []);
      fields.add(fieldName);
      next.set(questionId, fields);
      return next;
    });
    setStatus("dirty");
  }

  // Perubahan soal (teks, tipe, opsi, referensi jawaban esai) sekarang cuma
  // diubah di state lokal -- dikirim ke backend saat admin klik tombol
  // Simpan (handleSaveQuiz), bukan lagi PATCH di setiap keystroke.
  function updateQuestion(id, patch, fieldName) {
    const nextQuestions = questions.map((q) => (q.id === id ? { ...q, ...patch } : q));
    setYear({ ...year, quiz: { ...quiz, questions: nextQuestions } });
    markFieldDirty(id, fieldName);
  }

  async function deleteQuestion(id) {
    await apiClient.delete(`/admin/quiz-questions/${id}`);
    setYear({ ...year, quiz: { ...quiz, questions: questions.filter((q) => q.id !== id) } });
    setActiveQuestionIndex(0);
    setDirtyFields((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  async function togglePublish() {
    try {
      // QuizController::publish() baca is_published dari body request
      const { data } = await apiClient.patch(`/admin/quizzes/${quiz.id}/publish`, {
        is_published: !quiz.is_published,
      });
      setYear({ ...year, quiz: { ...quiz, ...data } });
    } catch (e) {
      alert(e?.response?.data?.message ?? "Gagal publish (butuh min. 1 soal + rangkuman terisi");
    }
  }

  async function handleSaveQuiz() {
    if (dirtyFields.size === 0) {
      setStatus("saved");
      return;
    }
    setStatus("saving");
    try {
      await Promise.all(
        Array.from(dirtyFields.keys()).map((id) => {
          const q = questions.find((qq) => qq.id === id);
          if (!q) return Promise.resolve();
          return apiClient.patch(`/admin/quiz-questions/${id}`, {
            question: q.question,
            options: q.options,
          });
        })
      );
      setDirtyFields(new Map());
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      alert(e?.response?.data?.message ?? "Gagal menyimpan soal.");
    }
  }

  function selectQuestion(i) {
    if (i === activeQuestionIndex) return;
    setActiveQuestionIndex(i);
  }

  if (!quiz) {
    return <EmptyPanel text="Memuat kuis…" />;
  }

  const activeQuestion = questions[activeQuestionIndex];
  const activeDirtyFields = activeQuestion ? dirtyFields.get(activeQuestion.id) ?? new Set() : new Set();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Soal ({questions.length}/5)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addQuestion} disabled={questions.length >= 5}>
            <Plus size={12} /> Soal
          </Button>
          <Button size="sm" variant="outline" onClick={togglePublish}>
            {quiz.is_published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => selectQuestion(i)}
            className={`relative h-8 w-8 rounded-full text-xs font-medium ${
              activeQuestionIndex === i ? "bg-gamify text-white" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {i + 1}
            {dirtyQuestionIds.has(q.id) && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-orange-400"
                title="Ada field belum disimpan di soal ini"
              />
            )}
          </button>
        ))}
      </div>

      {activeQuestion && (
        <div className="space-y-3 rounded-lg border border-zinc-100 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-400">Teks soal</p>
              {activeDirtyFields.has("question") && <UnsavedFieldBadge />}
            </div>
            <Textarea
              value={activeQuestion.question}
              placeholder="Tulis soal…"
              onChange={(e) => updateQuestion(activeQuestion.id, { question: e.target.value }, "question")}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-400">Opsi jawaban</p>
              {activeDirtyFields.has("options") && <UnsavedFieldBadge />}
            </div>
            <OptionsEditor
              question={activeQuestion}
              onChange={(options) => updateQuestion(activeQuestion.id, { options }, "options")}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={() => deleteQuestion(activeQuestion.id)}>
            <Trash2 size={14} className="text-red-500" /> Hapus soal
          </Button>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
        <SaveButton status={status} onClick={handleSaveQuiz} />
      </div>
    </div>
  );
}

function OptionsEditor({ question, onChange }) {
  const options = question.options ?? [];

  function setOption(i, patch) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function setCorrect(i) {
    onChange(options.map((o, idx) => ({ ...o, is_correct: idx === i })));
  }

  function addOption() {
    onChange([...options, { option_text: "", is_correct: false }]);
  }

  function removeOption(i) {
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" checked={!!o.is_correct} onChange={() => setCorrect(i)} />
          <Input
            value={o.option_text}
            placeholder={`Opsi ${i + 1}`}
            onChange={(e) => setOption(i, { option_text: e.target.value })}
          />
          <Button variant="ghost" size="icon" onClick={() => removeOption(i)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addOption}>
        <Plus size={12} /> Opsi
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- Helpers */

function EmptyPanel({ text, children }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
      {text}
      {children}
    </div>
  );
}