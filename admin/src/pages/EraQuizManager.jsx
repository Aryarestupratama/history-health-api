import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import apiClient from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PhonePreview from "@/components/PhonePreview";
import { ERA_ACCENTS } from "@/config/branding";

/**
 * <EraQuizManager era={{ id, name, slug }} />
 *
 * Tab "Kuis Sumatif" di level Era pada Content Studio (Rules.md R-ERAQUIZ,
 * Schema.md era_quizzes/era_quiz_questions/era_quiz_question_options).
 * Mirror persis WabahWorkspace::QuizTab (kuis year), bedanya:
 * - endpoint ke /admin/eras/{era.id}/quiz & /admin/era-quiz(zes|-questions)
 * - TIDAK ada batas maksimal 5 soal (R-ERAQUIZ-06)
 * - hint publish TIDAK menyebut "rangkuman terisi" (era tidak punya summary)
 *
 * Dipasang sebagai halaman/tab terpisah di level Era (sebelum grid Tahun),
 * BUKAN di dalam WabahWorkspace — kuis ini melekat ke era, bukan year.
 */
export default function EraQuizManager({ era }) {
  const [eraQuiz, setEraQuiz] = useState(null); // { id, era_id, is_published, questions: [...] }
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | dirty | saving | saved | error
  const [dirtyFields, setDirtyFields] = useState(new Map()); // Map<questionId, Set<fieldName>>

  const accent = ERA_ACCENTS?.[era?.slug]?.hex;
  const questions = eraQuiz?.questions ?? [];
  const dirtyQuestionIds = new Set(dirtyFields.keys());

  useEffect(() => {
    if (!era) return;
    apiClient.get(`/admin/eras/${era.id}/quiz`).then(({ data }) => {
      setEraQuiz(data);
      setActiveQuestionIndex(0);
      setDirtyFields(new Map());
      setStatus("idle");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [era?.id]);

  async function addQuestion() {
    if (!eraQuiz) return;
    // R-ERAQUIZ-06: TIDAK ada batas maksimal jumlah soal — beda dari kuis
    // year yang dibatasi 5 (QuizTab::addQuestion()).
    const { data } = await apiClient.post(`/admin/era-quizzes/${eraQuiz.id}/questions`, {
      question: "",
      explanation_correct: "",
      explanation_incorrect: "",
      options: [{ option_text: "", is_correct: true }, { option_text: "", is_correct: false }],
    });
    setEraQuiz({ ...eraQuiz, questions: [...questions, data] });
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

  function updateQuestion(id, patch, fieldName) {
    const nextQuestions = questions.map((q) => (q.id === id ? { ...q, ...patch } : q));
    setEraQuiz({ ...eraQuiz, questions: nextQuestions });
    markFieldDirty(id, fieldName);
  }

  async function deleteQuestion(id) {
    await apiClient.delete(`/admin/era-quiz-questions/${id}`);
    setEraQuiz({ ...eraQuiz, questions: questions.filter((q) => q.id !== id) });
    setActiveQuestionIndex(0);
    setDirtyFields((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  async function togglePublish() {
    try {
      const { data } = await apiClient.patch(`/admin/era-quizzes/${eraQuiz.id}/publish`, {
        is_published: !eraQuiz.is_published,
      });
      setEraQuiz({ ...eraQuiz, ...data });
    } catch (e) {
      alert(
        e?.response?.data?.message ??
          "Gagal publish (butuh minimal 1 soal + setiap soal punya penjelasan benar & salah)."
      );
    }
  }

  async function handleSave() {
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
          return apiClient.patch(`/admin/era-quiz-questions/${id}`, {
            question: q.question,
            explanation_correct: q.explanation_correct,
            explanation_incorrect: q.explanation_incorrect,
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

  if (!eraQuiz) {
    return <p className="text-sm text-zinc-400">Memuat kuis sumatif…</p>;
  }

  const activeQuestion = questions[activeQuestionIndex];
  const activeDirtyFields = activeQuestion ? dirtyFields.get(activeQuestion.id) ?? new Set() : new Set();
  const missingExplanationCount = questions.filter(
    (q) => !q.explanation_correct || !q.explanation_incorrect
  ).length;

  const previewData = {
    activeIndex: activeQuestionIndex,
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      explanation_correct: q.explanation_correct,
      explanation_incorrect: q.explanation_incorrect,
      options: q.options ?? [],
    })),
    // Beda dari kuis year: kuis sumatif era submit di akhir & ADA halaman
    // skor — footerNote menimpa teks default QuizScreen ("tanpa tampilan
    // skor") supaya admin tidak salah paham soal perilaku end-user asli.
    footerNote: "Submit di soal terakhir · ada halaman skor & rekap setelah selesai",
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,320px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Kuis Sumatif — {era?.name}
            </p>
            <p className="text-[11px] text-zinc-400">
              Soal ({questions.length}) &middot; tidak ada batas jumlah maksimal
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus size={12} /> Soal
            </Button>
            <Button size="sm" variant="outline" onClick={togglePublish}>
              {eraQuiz.is_published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-medium text-zinc-400">
                  Penjelasan jika jawaban <span className="text-emerald-500">BENAR</span>
                </p>
                {activeDirtyFields.has("explanation_correct") && <UnsavedFieldBadge />}
              </div>
              <Textarea
                value={activeQuestion.explanation_correct}
                placeholder="Apresiasi + penguat pemahaman, tampil di halaman rekap saat jawaban benar…"
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
                placeholder="Jelaskan kenapa opsi yang benar itu benar, tampil di halaman rekap saat jawaban salah…"
                onChange={(e) =>
                  updateQuestion(activeQuestion.id, { explanation_incorrect: e.target.value }, "explanation_incorrect")
                }
              />
            </div>

            <Button variant="ghost" size="sm" onClick={() => deleteQuestion(activeQuestion.id)}>
              <Trash2 size={14} className="text-red-500" /> Hapus soal
            </Button>
          </div>
        )}

        {/* R-ERAQUIZ-10: hint client-side, bukan pengganti validasi backend —
            EraQuiz::canPublish() tetap sumber kebenaran. TIDAK menyebut
            "rangkuman" (beda dari hint kuis year) karena era tidak punya
            kolom summary. */}
        {missingExplanationCount > 0 && (
          <p className="text-xs text-amber-600">
            {missingExplanationCount} soal masih punya penjelasan benar/salah yang kosong — wajib
            lengkap dulu sebelum kuis sumatif bisa dipublish.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <SaveButton status={status} onClick={handleSave} />
        </div>
      </div>

      <PhonePreview screen="quiz" data={previewData} eraSlug={era?.slug} compact />
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

function UnsavedFieldBadge() {
  return (
    <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
      belum disimpan
    </span>
  );
}

function SaveButton({ status, onClick }) {
  const label =
    status === "saving" ? "Menyimpan…" : status === "saved" ? "Tersimpan" : status === "error" ? "Gagal, coba lagi" : "Simpan";

  return (
    <Button onClick={onClick} disabled={status === "saving" || status === "idle"}>
      {label}
    </Button>
  );
}