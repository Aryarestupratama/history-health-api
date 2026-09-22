import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "sonner";
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

// Skema warna tombol dipakai konsisten di seluruh workspace ini:
// - Publish/Simpan -> hitam, teks putih
// - Hapus (section/soal/opsi/referensi/blok) -> merah, teks putih
// - "+" tambah section -> hitam, ikon putih
// Ditulis sebagai konstanta supaya gampang dipakai ulang & konsisten,
// bukan class ad-hoc yang beda-beda tiap tombol.
const BTN_DARK =
  "bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:ring-zinc-900 disabled:opacity-50";
const BTN_RED =
  "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 disabled:opacity-50";

export default function WabahWorkspace() {
  const { yearId } = useParams();
  const { confirm: confirmDialog, dialog } = useConfirm();

  const [year, setYear] = useState(null); // { id, year, title, quote_text, references, era: {slug,name}, sections: [], vaccines: [], quiz: {...}, summary: {id, is_published, points:[...]} }
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("section");

  // state khusus per tab, disinkronkan ke PhonePreview secara live
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  // (Baru) poin Rangkuman Interaktif yang sedang diedit/dipreview — sama
  // pola dengan activeQuestionIndex di atas (kuis), tapi selalu 0-6 karena
  // jumlah poin fixed 7 (R-SUM-01), tidak pernah bertambah/berkurang.
  const [activeSummaryPointIndex, setActiveSummaryPointIndex] = useState(0);

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
  // (Baru) header_image OPSIONAL per section — dirty tracking terpisah dari
  // title, supaya badge "belum disimpan" akurat per field (bisa jadi cuma
  // title yang berubah, cuma header_image, atau dua-duanya sekaligus).
  const [sectionHeaderImageDirty, setSectionHeaderImageDirty] = useState(new Set());
  const [sectionBlockDirty, setSectionBlockDirty] = useState(new Set());
  const [summaryDirty, setSummaryDirty] = useState(false);
  // (Baru) Set<pointId> — poin Rangkuman Interaktif mana yang 3 opsinya
  // berubah, terpisah dari summaryDirty (yang sekarang cuma quote_text +
  // references) karena keduanya disimpan lewat endpoint BERBEDA:
  // PUT /admin/years/{id} vs PATCH /admin/year-summary-points/{id}.
  const [summaryPointsDirty, setSummaryPointsDirty] = useState(new Set());
  const [vaccinesDirty, setVaccinesDirty] = useState(false);
  const [quizFieldDirty, setQuizFieldDirty] = useState(new Map());

  const hasAnyUnsaved =
    sectionTitleDirty.size > 0 ||
    sectionHeaderImageDirty.size > 0 ||
    sectionBlockDirty.size > 0 ||
    summaryDirty ||
    summaryPointsDirty.size > 0 ||
    vaccinesDirty ||
    quizFieldDirty.size > 0;

  function resetAllDirty() {
    setSectionTitleDirty(new Set());
    setSectionHeaderImageDirty(new Set());
    setSectionBlockDirty(new Set());
    setSummaryDirty(false);
    setSummaryPointsDirty(new Set());
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
    if (sectionHeaderImageDirty.has(sectionId)) return true;
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
            // (Revisi) `sectionTitle` TIDAK LAGI dirender sebagai judul di
            // layar end-user — dikirim tetap (buat referensi/label saja),
            // posisi paling atas sekarang `headerImageUrl` (opsional, bisa
            // null kalau section ini belum/tidak diisi header gambar).
            sectionTitle: activeSection.title,
            headerImageUrl: activeSection.resolved_header_image_url ?? null,
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
          // (Revisi — Rangkuman Interaktif) `summaryImageUrl` DIHAPUS —
          // rangkuman sekarang 7 poin correct-statement (year.summary.points),
          // preview cuma render poin yang sedang aktif diedit
          // (activeSummaryPointIndex), sama pola dengan QuizScreen yang
          // render 1 soal aktif sesuai activeQuestionIndex.
          points: year.summary?.points ?? [],
          activePointIndex: activeSummaryPointIndex,
          // Quote & Referensi — tampil di layar yang sama, urutan sesuai
          // Flutter: rangkuman > quote > referensi > tombol kuis.
          quoteText: year.quote_text ?? null,
          references: year.references ?? [],
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
  }, [year, activeTab, activeSectionId, activeQuestionIndex, activeSummaryPointIndex]);

  if (loading || !year) {
    return <div className="p-8 text-sm text-zinc-400">Memuat workspace…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {dialog}
      <Breadcrumb year={year} confirmDiscardIfUnsaved={confirmDiscardIfUnsaved} />

      <div className="border-b border-zinc-100 px-6 pb-4 pt-1">
        <div className="inline-flex items-center gap-1 rounded-full bg-zinc-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === t.key ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-[65%_35%] gap-4 overflow-hidden bg-zinc-50 p-4">
        <div className="overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
              headerImageDirty={sectionHeaderImageDirty}
              setHeaderImageDirty={setSectionHeaderImageDirty}
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
              summaryPointsDirty={summaryPointsDirty}
              setSummaryPointsDirty={setSummaryPointsDirty}
              vaccinesDirty={vaccinesDirty}
              setVaccinesDirty={setVaccinesDirty}
              activePointIndex={activeSummaryPointIndex}
              setActivePointIndex={setActiveSummaryPointIndex}
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

        <div className="flex items-start justify-center overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50/60 p-6 shadow-sm">
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
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <span className="mr-0.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: eraAccent }} />
        <span className="font-semibold" style={{ color: eraAccent }}>
          {year.era?.name}
        </span>
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
      idle: { label: "Simpan", className: BTN_DARK },
      dirty: { label: "Simpan", className: BTN_DARK },
      saving: { label: "Menyimpan…", className: BTN_DARK },
      saved: { label: "Tersimpan", className: BTN_DARK },
      error: { label: "Gagal, coba lagi", className: BTN_RED },
    }[status] ?? { label: "Simpan", className: BTN_DARK };

  return (
    <Button onClick={onClick} disabled={status === "saving"} className={config.className}>
      <Save size={14} /> {config.label}
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
  headerImageDirty,
  setHeaderImageDirty,
  blockDirty,
  setBlockDirty,
}) {
  const activeSection = year.sections?.find((s) => s.id === activeSectionId);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const orderedSections = (year.sections ?? []).slice().sort((a, b) => a.order - b.order);

  function isSectionDirty(sectionId) {
    if (titleDirty.has(sectionId)) return true;
    if (headerImageDirty.has(sectionId)) return true;
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

  // (Baru) header_image OPSIONAL per section — boleh dikosongkan (hapus
  // link, jadi string kosong / null) kapan saja, bukan wajib diisi.
  function editSectionHeaderImage(id, headerImage) {
    setYear({
      ...year,
      sections: year.sections.map((s) => (s.id === id ? { ...s, header_image: headerImage } : s)),
    });
    setHeaderImageDirty((prev) => new Set(prev).add(id));
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
      toast.success(data.is_published ? "Section dipublish" : "Section di-unpublish");
    } catch (e) {
      toast.error(e?.response?.data?.message ?? "Gagal ubah status publish");
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
    setHeaderImageDirty((prev) => {
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
      // title & header_image sama-sama field milik Section (bukan content
      // block), jadi digabung 1 PUT kalau salah satu atau keduanya dirty —
      // menghindari 2 request terpisah untuk 1 section yang sama.
      const sectionPayload = {};
      if (titleDirty.has(activeSection.id)) sectionPayload.title = activeSection.title;
      if (headerImageDirty.has(activeSection.id)) sectionPayload.header_image = activeSection.header_image || null;

      let refreshedSection = null;
      if (Object.keys(sectionPayload).length > 0) {
        const { data } = await apiClient.put(`/admin/sections/${activeSection.id}`, sectionPayload);
        refreshedSection = data; // includes resolved_header_image_url terbaru
      }

      const blocksToSave = (activeSection.content_blocks ?? []).filter((b) => blockDirty.has(b.id));
      const updatedBlocks = await Promise.all(
        blocksToSave.map((b) =>
          apiClient
            // Caption dikirim bersamaan dengan content — keduanya field
            // milik block yang sama, tidak perlu request terpisah.
            .patch(`/admin/sections/${activeSection.id}/content-blocks/${b.id}`, {
              content: b.content,
              caption: b.caption || null,
            })
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
          return { ...s, ...(refreshedSection ?? {}), content_blocks: merged };
        }),
      }));
      setTitleDirty((prev) => {
        const next = new Set(prev);
        next.delete(activeSection.id);
        return next;
      });
      setHeaderImageDirty((prev) => {
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
      toast.success("Section berhasil disimpan");
    } catch (e) {
      setStatus("error");
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan section.");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-[220px_1fr] gap-4">
      {/* Sidebar list section -- kartu tersendiri supaya tidak menyatu
          dengan panel editor di sebelahnya (poin 3) */}
      <div className="h-fit rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Section</p>
          <Button size="icon" onClick={addSection} className={`h-9 w-9 rounded-lg ${BTN_DARK}`}>
            <Plus size={18} />
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

      {/* Editor section aktif -- kartu tersendiri, dibatasi max-width &
          jadi scrollable kalau kontennya (blok) makin panjang (poin 5) */}
      <div className="max-h-[75vh] space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4">
        {!activeSection ? (
          <EmptyPanel text="Belum ada section. Tambahkan section baru di sidebar kiri." />
        ) : (
          <div className="mx-auto w-full max-w-2xl space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Judul Section <span className="normal-case font-normal text-zinc-400">(label admin saja, tidak tampil ke user)</span>
                </p>
                {titleDirty.has(activeSection.id) && <UnsavedFieldBadge />}
              </div>
              <Input
                value={activeSection.title}
                onChange={(e) => editSectionTitle(activeSection.id, e.target.value)}
                placeholder="Judul section…"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Header Gambar <span className="normal-case font-normal text-zinc-400">(opsional)</span>
                </p>
                {headerImageDirty.has(activeSection.id) && <UnsavedFieldBadge />}
              </div>
              <Input
                value={activeSection.header_image ?? ""}
                onChange={(e) => editSectionHeaderImage(activeSection.id, e.target.value)}
                placeholder="Link Google Drive (boleh dikosongkan)…"
              />
              <p className="mt-1 text-[11px] text-zinc-400">
                Tampil di posisi paling atas layar Detail Section, menggantikan judul. Boleh diisi
                boleh tidak — kalau kosong, section langsung mulai dari blok konten pertama.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Blok Konten
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => togglePublish(activeSection)} className={BTN_DARK}>
                  {activeSection.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" onClick={() => deleteSection(activeSection.id)} className={BTN_RED}>
                  <Trash2 size={14} /> Hapus section
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
          </div>
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

  // (Baru) Guard client-side maks 2 block 'video' per section -- hint saja,
  // bukan pengganti validasi backend (ContentBlockController::store()/update()
  // tetap sumber kebenaran, sama pola dengan hint missingExplanationCount di
  // QuizTab). Alasan limit: performa render WebView Drive kalau terlalu
  // banyak video aktif sekaligus di 1 section (lihat Architecture.md §4.1).
  const videoCount = orderedBlocks.filter((b) => b.type === "video").length;
  const videoLimitReached = videoCount >= 2;

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
  // `patch` bisa berisi { content } dan/atau { caption } -- caption cuma
  // relevan utk type image/video, tapi fungsi ini generik untuk semua type.
  function updateBlock(id, patch) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
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
              <Button size="icon" onClick={() => removeBlock(b.id)} className={`h-8 w-8 ${BTN_RED}`}>
                <Trash2 size={14} />
              </Button>
            </div>
            {b.type === "text" ? (
              <Textarea
                defaultValue={b.content}
                placeholder="Tulis teks konten…"
                onChange={(e) => updateBlock(b.id, { content: e.target.value })}
              />
            ) : (
              <Input
                defaultValue={b.content}
                // (Revisi) Video kini via Google Drive juga, bukan lagi
                // YouTube (Rules.md R-CMS-06 revisi) -- placeholder sekarang
                // sama dengan image/pdf, ditambah hint batas ukuran/durasi.
                placeholder={
                  b.type === "video" ? "Link Google Drive (maks 50MB, disarankan ≤10 menit)" : "Link Google Drive"
                }
                onChange={(e) => updateBlock(b.id, { content: e.target.value })}
              />
            )}
            {/* (Baru) Caption -- OPSIONAL, cuma relevan utk image/video
                (sumber/keterangan media). Tidak ditampilkan utk text/pdf. */}
            {(b.type === "image" || b.type === "video") && (
              <Input
                className="mt-2"
                defaultValue={b.caption ?? ""}
                placeholder="Caption (opsional) — mis. sumber/keterangan gambar atau video…"
                onChange={(e) => updateBlock(b.id, { caption: e.target.value })}
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2">
        {["text", "image", "video", "pdf"].map((t) => {
          const disabled = t === "video" && videoLimitReached;
          return (
            <Button
              key={t}
              variant="outline"
              disabled={disabled}
              title={disabled ? "Maksimal 2 video per section" : undefined}
              onClick={() => addBlock(t)}
            >
              <Plus size={14} /> {t}
            </Button>
          );
        })}
      </div>
      {videoLimitReached && (
        <p className="text-xs text-amber-600">
          Section ini sudah punya 2 video (maks). Hapus salah satu dulu untuk menambah video baru.
        </p>
      )}
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
  summaryPointsDirty,
  setSummaryPointsDirty,
  vaccinesDirty,
  setVaccinesDirty,
  activePointIndex,
  setActivePointIndex,
}) {
  const [allVaccines, setAllVaccines] = useState([]);
  const summary = year.summary;
  const points = summary?.points ?? [];

  useEffect(() => {
    apiClient.get("/admin/vaccines").then(({ data }) => setAllVaccines(data));
  }, []);

  // GET /admin/years/{year}/summary — YearSummaryController::show()
  // firstOrCreate rangkuman + auto-generate skeleton 7 poin x 3 opsi kosong
  // (ensureSkeleton()) kalau belum ada. Sama pola lazy-fetch dengan
  // QuizTab (year.quiz dimuat shallow oleh YearController::show(), detail
  // lengkap baru diambil di sini saat tab-nya benar-benar dibuka).
  useEffect(() => {
    if (!summary || summary.points === undefined) {
      apiClient.get(`/admin/years/${year.id}/summary`).then(({ data }) => {
        setYear((prev) => ({ ...prev, summary: data }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // (Baru) Quote — 1 teks kutipan per wabah.
  function editQuoteText(quoteText) {
    setYear({ ...year, quote_text: quoteText });
    setSummaryDirty(true);
    setStatus("dirty");
  }

  // (Baru) Referensi — replace penuh array setiap kali berubah (bukan
  // append/patch parsial) -- lebih sederhana daripada nge-track index yang
  // berubah, dan sesuai cara ReferencesEditor mengembalikan array baru.
  function editReferences(references) {
    setYear({ ...year, references });
    setSummaryDirty(true);
    setStatus("dirty");
  }

  // Ganti isi 1 opsi pada poin aktif — TIDAK langsung PATCH ke backend,
  // cuma ubah state lokal + tandai poin ini dirty (sama pola dengan
  // updateQuestion() di QuizTab), dikirim sungguhan saat admin klik Simpan.
  function updatePointOption(pointId, optionIndex, patch) {
    const nextPoints = points.map((p) => {
      if (p.id !== pointId) return p;
      return { ...p, options: p.options.map((o, i) => (i === optionIndex ? { ...o, ...patch } : o)) };
    });
    setYear({ ...year, summary: { ...summary, points: nextPoints } });
    setSummaryPointsDirty((prev) => new Set(prev).add(pointId));
    setStatus("dirty");
  }

  // R-SUM-02: tepat 1 opsi ditandai benar per poin — sama pola dengan
  // OptionsEditor::setCorrect() di tab Kuis.
  function setCorrectOption(pointId, optionIndex) {
    const nextPoints = points.map((p) => {
      if (p.id !== pointId) return p;
      return { ...p, options: p.options.map((o, i) => ({ ...o, is_correct: i === optionIndex })) };
    });
    setYear({ ...year, summary: { ...summary, points: nextPoints } });
    setSummaryPointsDirty((prev) => new Set(prev).add(pointId));
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

  async function togglePublishSummary() {
    try {
      // YearSummaryController::publish() baca is_published dari body request
      const { data } = await apiClient.patch(`/admin/year-summaries/${summary.id}/publish`, {
        is_published: !summary.is_published,
      });
      setYear({ ...year, summary: { ...summary, ...data } });
      toast.success(data.is_published ? "Rangkuman Interaktif dipublish" : "Rangkuman Interaktif di-unpublish");
    } catch (e) {
      toast.error(
        e?.response?.data?.message ??
          "Gagal publish (butuh seluruh 7 poin terisi, tiap poin 3 opsi dengan tepat 1 ditandai benar)"
      );
    }
  }

  async function handleSave() {
    setStatus("saving");
    try {
      if (summaryDirty) {
        const { data } = await apiClient.put(`/admin/years/${year.id}`, {
          quote_text: year.quote_text || null,
          references: year.references ?? [],
        });
        setYear((prev) => ({ ...prev, ...data }));
      }
      if (summaryPointsDirty.size > 0) {
        // 1 PATCH per poin yang berubah — sama pola dengan handleSaveQuiz()
        // (Promise.all per soal dirty), bukan 1 endpoint batch untuk semua
        // 7 poin sekaligus (lebih simpel & konsisten dengan pola existing).
        await Promise.all(
          Array.from(summaryPointsDirty).map((pointId) => {
            const point = points.find((p) => p.id === pointId);
            if (!point) return Promise.resolve();
            return apiClient.patch(`/admin/year-summary-points/${pointId}`, {
              options: point.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })),
            });
          })
        );
        setSummaryPointsDirty(new Set());
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
      toast.success("Rangkuman & vaksin berhasil disimpan");
    } catch (e) {
      setStatus("error");
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan rangkuman/vaksin.");
    }
  }

  const activePoint = points[activePointIndex];
  // Hint client-side (bukan pengganti validasi backend) — poin yang salah
  // satu dari 3 teks opsinya masih kosong, sama filosofi dengan
  // missingExplanationCount di tab Kuis.
  const incompletePointCount = points.filter((p) => (p.options ?? []).some((o) => !o.option_text?.trim())).length;

  return (
    <div className="mx-auto max-h-[75vh] w-full max-w-2xl space-y-4 overflow-y-auto pr-1">
      {/* Urutan card di bawah SENGAJA mengikuti urutan tampil di layar
          end-user (Design.md §3.3.4, revisi Rangkuman Interaktif): 7 Poin
          Rangkuman > Quote+Referensi > Vaksin (tombol Kuis-nya sendiri ada
          di tab Kuis terpisah). Tiap bagian dibatasi kartu sendiri (poin 7)
          supaya tidak terlihat menyatu. */}

      <Panel>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Rangkuman Interaktif ({points.length}/7 poin)
          </p>
          {summary && (
            <Button size="sm" onClick={togglePublishSummary} className={BTN_DARK}>
              {summary.is_published ? "Unpublish" : "Publish"}
            </Button>
          )}
        </div>

        {!summary ? (
          <EmptyPanel text="Memuat rangkuman…" />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {points.map((p, i) => (
                <NumberBadge
                  key={p.id}
                  active={activePointIndex === i}
                  dirty={summaryPointsDirty.has(p.id)}
                  onClick={() => setActivePointIndex(i)}
                >
                  {i + 1}
                </NumberBadge>
              ))}
            </div>

            {activePoint && (
              <div className="space-y-2 rounded-lg border border-zinc-100 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] font-medium text-zinc-400">
                    Poin {activePointIndex + 1} — 1 kalimat benar + 2 kalimat pengecoh (mirip, beda sedikit)
                  </p>
                  {summaryPointsDirty.has(activePoint.id) && <UnsavedFieldBadge />}
                </div>
                {(activePoint.options ?? []).map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!!option.is_correct}
                      onChange={() => setCorrectOption(activePoint.id, i)}
                      title="Tandai sebagai kalimat benar"
                    />
                    <Input
                      value={option.option_text ?? ""}
                      placeholder={option.is_correct ? "Kalimat benar…" : `Kalimat pengecoh ${i + 1}…`}
                      onChange={(e) => updatePointOption(activePoint.id, i, { option_text: e.target.value })}
                    />
                  </div>
                ))}
                <p className="pt-1 text-[11px] text-zinc-400">
                  Klik bulatan di kiri untuk menandai opsi mana yang jadi kalimat benar (wajib tepat 1).
                </p>
              </div>
            )}
          </>
        )}

        {incompletePointCount > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            {incompletePointCount} poin masih ada opsi kosong — wajib lengkap dulu sebelum rangkuman bisa
            dipublish.
          </p>
        )}
      </Panel>

      <Panel className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Quote <span className="normal-case font-normal text-zinc-400">(opsional)</span>
            </p>
            {summaryDirty && <UnsavedFieldBadge />}
          </div>
          <Textarea
            rows={3}
            value={year.quote_text ?? ""}
            onChange={(e) => editQuoteText(e.target.value)}
            placeholder="Kutipan singkat terkait wabah ini…"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Referensi <span className="normal-case font-normal text-zinc-400">(opsional)</span>
            </p>
            {summaryDirty && <UnsavedFieldBadge />}
          </div>
          <ReferencesEditor references={year.references ?? []} onChange={editReferences} />
        </div>
      </Panel>

      <Panel>
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
      </Panel>

      <div className="flex items-center justify-end gap-2 pt-1">
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
    // R-QUIZ-06 (revisi): batas sekarang 10 (dulu 5) — TAPI publish tetap
    // butuh TEPAT 10, bukan "sampai 10 boleh kurang" (lihat Quiz::canPublish()
    // backend & label "Soal (n/10)" di bawah).
    if (questions.length >= 10) return toast.error("Maksimal 10 soal per kuis (R-QUIZ-06).");
    const { data } = await apiClient.post(`/admin/quizzes/${quiz.id}/questions`, {
      question: "",
      // R-QUIZ-04/R-QUIZ-10 (revisi terbaru — feedback kuis 2 kolom): sama
      // pola skeleton kosong seperti 'question' — diisi belakangan lewat
      // updateQuestion(), wajib lengkap baru saat admin coba publish
      // (lihat Quiz::canPublish() backend).
      explanation_correct: "",
      explanation_incorrect: "",
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
      toast.success(data.is_published ? "Kuis dipublish" : "Kuis di-unpublish");
    } catch (e) {
      toast.error(
        e?.response?.data?.message ??
          "Gagal publish (butuh TEPAT 10 soal + rangkuman terisi). Kuis kini berskor, passing grade 75% (tetap, tidak bisa diubah admin)."
      );
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
            explanation_correct: q.explanation_correct,
            explanation_incorrect: q.explanation_incorrect,
            options: q.options,
          });
        })
      );
      setDirtyFields(new Map());
      setStatus("saved");
      toast.success("Soal kuis berhasil disimpan");
    } catch (e) {
      setStatus("error");
      toast.error(e?.response?.data?.message ?? "Gagal menyimpan soal.");
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
  const missingExplanationCount = questions.filter(
    (q) => !q.explanation_correct || !q.explanation_incorrect
  ).length;

  return (
    <div className="mx-auto max-h-[75vh] w-full max-w-2xl space-y-4 overflow-y-auto pr-1">
      <Panel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Soal ({questions.length}/10)
          </p>
          {/* R-QUIZ-11 (baru): passing grade fixed 75%, tidak bisa diubah
              admin — info-only supaya admin tahu kenapa publish butuh TEPAT
              10 soal (bukan sekadar "boleh kurang"), dan kenapa user bisa
              mengerjakan ulang kalau nilainya di bawah 75%. */}
          <p className="text-[11px] text-zinc-400">
            Berskor · passing grade 75% · boleh dikerjakan ulang user sampai lulus
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addQuestion} disabled={questions.length >= 10}>
            <Plus size={14} /> Soal
          </Button>
          <Button onClick={togglePublish} className={BTN_DARK}>
            {quiz.is_published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="mb-1 mt-3 flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <NumberBadge
            key={q.id}
            active={activeQuestionIndex === i}
            dirty={dirtyQuestionIds.has(q.id)}
            onClick={() => selectQuestion(i)}
          >
            {i + 1}
          </NumberBadge>
        ))}
      </div>
      </Panel>

      {activeQuestion && (
        <Panel className="space-y-3">
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

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-400">
                Penjelasan jika jawaban <span className="text-emerald-500">BENAR</span>
              </p>
              {activeDirtyFields.has("explanation_correct") && <UnsavedFieldBadge />}
            </div>
            <Textarea
              value={activeQuestion.explanation_correct}
              placeholder="Apresiasi + penguat pemahaman, tampil saat user jawab benar…"
              onChange={(e) =>
                updateQuestion(activeQuestion.id, { explanation_correct: e.target.value }, "explanation_correct")
              }
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-medium text-zinc-400">
                Penjelasan jika jawaban <span className="text-red-500">SALAH</span>
              </p>
              {activeDirtyFields.has("explanation_incorrect") && <UnsavedFieldBadge />}
            </div>
            <Textarea
              value={activeQuestion.explanation_incorrect}
              placeholder="Jelaskan kenapa opsi yang benar itu benar, tampil saat user jawab salah…"
              onChange={(e) =>
                updateQuestion(activeQuestion.id, { explanation_incorrect: e.target.value }, "explanation_incorrect")
              }
            />
          </div>

          <Button onClick={() => deleteQuestion(activeQuestion.id)} className={BTN_RED}>
            <Trash2 size={14} /> Hapus soal
          </Button>
        </Panel>
      )}

      {/* R-QUIZ-10: hint client-side, bukan pengganti validasi backend —
          Quiz::canPublish() tetap sumber kebenaran, ini cuma bantu admin
          tahu lebih awal kenapa publish nanti bisa ditolak. */}
      {missingExplanationCount > 0 && (
        <p className="text-xs text-amber-600">
          {missingExplanationCount} soal masih punya penjelasan benar/salah yang kosong — wajib
          lengkap dulu sebelum kuis bisa dipublish.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
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
          <Button size="icon" onClick={() => removeOption(i)} className={`h-8 w-8 ${BTN_RED}`}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addOption}>
        <Plus size={14} /> Opsi
      </Button>
    </div>
  );
}

/* --------------------------------------------------------- ReferencesEditor */
// List teks referensi (mis. daftar pustaka), ditampilkan/diedit sebagai list
// bernomor -- mirip pola OptionsEditor (kuis) tapi tanpa radio "benar/salah",
// murni tambah/hapus/edit teks bebas per item.

function ReferencesEditor({ references, onChange }) {
  function setItem(i, value) {
    onChange(references.map((r, idx) => (idx === i ? value : r)));
  }

  function addItem() {
    onChange([...references, ""]);
  }

  function removeItem(i) {
    onChange(references.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      {references.map((ref, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-right text-xs text-zinc-400">{i + 1}.</span>
          <Input
            value={ref}
            placeholder="Mis. Kementerian Kesehatan RI, judul dokumen, tahun…"
            onChange={(e) => setItem(i, e.target.value)}
          />
          <Button size="icon" onClick={() => removeItem(i)} className={`h-8 w-8 ${BTN_RED}`}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addItem}>
        <Plus size={14} /> Referensi
      </Button>
      {references.length === 0 && (
        <p className="text-xs text-zinc-400">Belum ada referensi. Opsional, boleh dikosongkan.</p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Helpers */

// Kartu pembatas generik -- dipakai untuk memisahkan setiap bagian
// (mis. Rangkuman / Quote & Referensi / Vaksin, atau tiap soal Kuis)
// supaya tidak terlihat menyatu satu sama lain (poin 3 & 7).
function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
}

// Numbering kotak (bukan bulat), hitam dengan teks putih -- dipakai
// konsisten di poin Rangkuman Interaktif maupun soal Kuis (poin 6 & 8).
// Status aktif dibedakan lewat ring, bukan lewat warna lain, karena warna
// numbering-nya sengaja dipatok hitam/putih.
function NumberBadge({ active, dirty, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-xs font-semibold text-white transition ${
        active ? "ring-2 ring-offset-2 ring-zinc-900" : "opacity-60 hover:opacity-100"
      }`}
    >
      {children}
      {dirty && (
        <span
          className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-400 ring-2 ring-white"
          title="Ada perubahan belum disimpan"
        />
      )}
    </button>
  );
}

function EmptyPanel({ text, children }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-400">
      {text}
      {children}
    </div>
  );
}