import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Save } from "lucide-react";
import apiClient from "@/api"; // axios instance dgn interceptor token Sanctum
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PhonePreview from "@/components/PhonePreview";
import { ERA_ACCENTS } from "@/config/branding";

const TABS = [
  { key: "section", label: "Section & Blok" },
  { key: "summary", label: "Rangkuman & Vaksin" },
  { key: "quiz", label: "Kuis" },
];

export default function WabahWorkspace() {
  const { yearId } = useParams();

  const [year, setYear] = useState(null); // { id, year, title, summary, era: {slug,name}, sections: [], vaccines: [], quiz: {...} }
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("section");

  // state khusus per tab, disinkronkan ke PhonePreview secara live
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    loadYear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearId]);

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
    setLoading(false);
  }

  const eraAccent = ERA_ACCENTS?.[year?.era?.slug]?.hex;

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
          totalQuestions: questions.length,
          activeIndex: activeQuestionIndex,
          question: questions[activeQuestionIndex] ?? null,
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
      <Breadcrumb year={year} />

      <div className="flex border-b border-zinc-100 px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              activeTab === t.key ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            }`}
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
          {activeTab === "section" && (
            <SectionBlokTab
              year={year}
              setYear={setYear}
              activeSectionId={activeSectionId}
              setActiveSectionId={setActiveSectionId}
              eraAccent={eraAccent}
            />
          )}
          {activeTab === "summary" && <SummaryVaccineTab year={year} setYear={setYear} />}
          {activeTab === "quiz" && (
            <QuizTab
              year={year}
              setYear={setYear}
              activeQuestionIndex={activeQuestionIndex}
              setActiveQuestionIndex={setActiveQuestionIndex}
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

function Breadcrumb({ year }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [siblingYears, setSiblingYears] = useState(null);

  async function toggle() {
    if (!open && !siblingYears) {
      const { data } = await apiClient.get(`/admin/years`, { params: { era_id: year.era?.id } });
      setSiblingYears(data.sort((a, b) => a.year - b.year));
    }
    setOpen((o) => !o);
  }

  return (
    <div className="relative px-6 pb-3 pt-5">
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
      >
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
            onClick={() => navigate("/studio")}
            className="mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-50"
          >
            ← Ganti masa (era) lain
          </button>
          {(siblingYears ?? []).map((y) => (
            <button
              key={y.id}
              onClick={() => {
                setOpen(false);
                navigate(`/studio/${y.id}`);
              }}
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

/* -------------------------------------------------------- Tab: Section & Blok */

function SectionBlokTab({ year, setYear, activeSectionId, setActiveSectionId, eraAccent }) {
  const activeSection = year.sections?.find((s) => s.id === activeSectionId);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const orderedSections = (year.sections ?? []).slice().sort((a, b) => a.order - b.order);

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

  async function saveSectionTitle(id, title) {
    setYear({
      ...year,
      sections: year.sections.map((s) => (s.id === id ? { ...s, title } : s)),
    });
    await apiClient.put(`/admin/sections/${id}`, { title });
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
              className={dragOverId === s.id && dragId !== s.id ? "border-t-2" : ""}
              style={dragOverId === s.id && dragId !== s.id ? { borderColor: eraAccent } : undefined}
            >
              <button
                onClick={() => setActiveSectionId(s.id)}
                className={`flex w-full cursor-grab items-center gap-2 rounded-lg px-3 py-2 text-left text-sm active:cursor-grabbing ${
                  activeSectionId === s.id ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-500 hover:bg-zinc-50"
                } ${dragId === s.id ? "opacity-40" : ""}`}
              >
                <GripVertical size={14} className="shrink-0 text-zinc-300" />
                <span className="flex-1 truncate">{s.title}</span>
                {s.is_published ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
          Drag ikon <GripVertical size={10} className="inline" /> untuk reorder — urutan menentukan sequential
          unlock (R-SECT-01).
        </p>
      </div>

      {/* Editor blok konten untuk section aktif */}
      <div>
        {!activeSection ? (
          <EmptyPanel text="Pilih atau buat section untuk mulai mengedit" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={activeSection.title}
                onChange={(e) => saveSectionTitle(activeSection.id, e.target.value)}
                className="text-base font-medium"
              />
              <Button variant="outline" size="sm" onClick={() => togglePublish(activeSection)}>
                {activeSection.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                {activeSection.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteSection(activeSection.id)}>
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>

            <ContentBlockEditor
              section={activeSection}
              onChange={(blocks) => {
                setYear({
                  ...year,
                  sections: year.sections.map((s) =>
                    s.id === activeSection.id ? { ...s, content_blocks: blocks } : s
                  ),
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ContentBlockEditor({ section, onChange }) {
  const blocks = section.content_blocks ?? [];
  const orderedBlocks = blocks.slice().sort((a, b) => a.order - b.order);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  async function addBlock(type) {
    const { data } = await apiClient.post(`/admin/sections/${section.id}/content-blocks`, {
      type,
      content: "",
    });
    onChange([...blocks, data]);
  }

  async function updateBlock(id, content) {
    // PATCH, bukan PUT — sesuai ContentBlockController::update di routes/api.php
    onChange(blocks.map((b) => (b.id === id ? { ...b, content, resolved_url: undefined } : b)));
    const { data } = await apiClient.patch(`/admin/sections/${section.id}/content-blocks/${id}`, { content });
    onChange(blocks.map((b) => (b.id === id ? data : b)));
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
      {orderedBlocks.map((b) => (
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
            dragOverId === b.id && dragId !== b.id ? "border-zinc-900" : "border-zinc-100"
          } ${dragId === b.id ? "opacity-40" : ""}`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="flex cursor-grab items-center gap-1 active:cursor-grabbing">
              <GripVertical size={14} className="text-zinc-300" />
              <Badge variant="secondary">{b.type}</Badge>
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
      ))}

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

function SummaryVaccineTab({ year, setYear }) {
  const [allVaccines, setAllVaccines] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get("/admin/vaccines").then(({ data }) => setAllVaccines(data));
  }, []);

  async function saveSummary(summary) {
    setYear({ ...year, summary });
  }

  async function persistSummary() {
    setSaving(true);
    await apiClient.put(`/admin/years/${year.id}`, { summary: year.summary });
    setSaving(false);
  }

  async function toggleVaccine(vaccine) {
    const selected = (year.vaccines ?? []).some((v) => v.id === vaccine.id);
    const nextIds = selected
      ? year.vaccines.filter((v) => v.id !== vaccine.id).map((v) => v.id)
      : [...(year.vaccines ?? []).map((v) => v.id), vaccine.id];

    const { data } = await apiClient.post(`/admin/years/${year.id}/assign-vaccines`, {
      vaccine_ids: nextIds,
    });
    setYear({ ...year, vaccines: data.vaccines });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Rangkuman Wabah (years.summary)
        </p>
        <Textarea
          rows={6}
          value={year.summary ?? ""}
          onChange={(e) => saveSummary(e.target.value)}
          onBlur={persistSummary}
          placeholder="Tulis rangkuman wabah ini…"
        />
        <p className="mt-1 text-[11px] text-zinc-400">
          {saving ? "Menyimpan…" : "Tersimpan otomatis saat keluar dari field ini."} Wajib terisi sebelum kuis
          bisa di-publish (R-QUIZ-05).
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Vaksin Terkait</p>
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
    </div>
  );
}

/* -------------------------------------------------------------- Tab: Kuis */

function QuizTab({ year, setYear, activeQuestionIndex, setActiveQuestionIndex }) {
  const quiz = year.quiz;
  const questions = quiz?.questions ?? [];

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
      type: "multiple_choice",
      options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }],
    });
    setYear({ ...year, quiz: { ...quiz, questions: [...questions, data] } });
    setActiveQuestionIndex(questions.length);
  }

  async function updateQuestion(id, patch) {
    const nextQuestions = questions.map((q) => (q.id === id ? { ...q, ...patch } : q));
    setYear({ ...year, quiz: { ...quiz, questions: nextQuestions } });
    // PATCH /admin/quiz-questions/{question} — tidak nested di bawah quiz (routes/api.php)
    const { data } = await apiClient.patch(`/admin/quiz-questions/${id}`, patch);
    setYear((prev) => ({
      ...prev,
      quiz: { ...prev.quiz, questions: prev.quiz.questions.map((q) => (q.id === id ? data : q)) },
    }));
  }

  async function deleteQuestion(id) {
    await apiClient.delete(`/admin/quiz-questions/${id}`);
    setYear({ ...year, quiz: { ...quiz, questions: questions.filter((q) => q.id !== id) } });
    setActiveQuestionIndex(0);
  }

  async function togglePublish() {
    try {
      // QuizController::publish() baca is_published dari body request
      const { data } = await apiClient.patch(`/admin/quizzes/${quiz.id}/publish`, {
        is_published: !quiz.is_published,
      });
      setYear({ ...year, quiz: { ...quiz, ...data } });
    } catch (e) {
      alert(e?.response?.data?.message ?? "Gagal publish (butuh min. 1 soal + rangkuman terisi — R-QUIZ-05)");
    }
  }

  if (!quiz) {
    return <EmptyPanel text="Memuat kuis…" />;
  }

  const activeQuestion = questions[activeQuestionIndex];

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
          <Button size="sm" onClick={togglePublish}>
            <Save size={12} /> {quiz.is_published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setActiveQuestionIndex(i)}
            className={`h-8 w-8 rounded-full text-xs font-medium ${
              activeQuestionIndex === i ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {activeQuestion && (
        <div className="space-y-3 rounded-lg border border-zinc-100 p-4">
          <Textarea
            value={activeQuestion.question}
            placeholder="Tulis soal…"
            onChange={(e) => updateQuestion(activeQuestion.id, { question: e.target.value })}
          />

          <Select
            value={activeQuestion.type}
            onValueChange={(type) => updateQuestion(activeQuestion.id, { type })}
          >
            <option value="multiple_choice">Pilihan ganda</option>
            <option value="essay">Esai</option>
          </Select>

          {activeQuestion.type === "multiple_choice" ? (
            <OptionsEditor
              question={activeQuestion}
              onChange={(options) => updateQuestion(activeQuestion.id, { options })}
            />
          ) : (
            <Input
              value={activeQuestion.correct_answer ?? ""}
              placeholder="Referensi jawaban (opsional, bukan untuk grading)"
              onChange={(e) => updateQuestion(activeQuestion.id, { correct_answer: e.target.value })}
            />
          )}

          <Button variant="ghost" size="sm" onClick={() => deleteQuestion(activeQuestion.id)}>
            <Trash2 size={14} className="text-red-500" /> Hapus soal
          </Button>
        </div>
      )}
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