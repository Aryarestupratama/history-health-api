import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, X, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../api';
import { cn } from '@/lib/utils';
import { getEraAccent } from '@/config/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';

// Halaman baru "Kelola Kuis" (Design.md §4, Architecture.md §4.2, Rules.md
// Bab 5). Kuis melekat ke `year` (1 kuis per year, R-QUIZ-01), maksimal 5
// soal (R-QUIZ-06), tipe multiple_choice/essay (R-QUIZ-07), publish butuh
// minimal 1 soal + years.summary terisi (R-QUIZ-05).
//
// CATATAN ENDPOINT: rute admin quiz belum pernah ditunjukkan di percakapan
// ini (routes/api.php & Admin/Quiz/QuizController belum di-upload), jadi
// path di bawah adalah ASUMSI mengikuti pola REST yang sudah dipakai di
// bagian lain project (mis. `/admin/sections/{id}/content-blocks`):
//   GET    /admin/years/{year}/quiz                      -> ambil/auto-create draft
//   PUT    /admin/quizzes/{quiz}                          -> toggle is_published
//   POST   /admin/quizzes/{quiz}/questions                -> tambah soal
//   PATCH  /admin/quizzes/{quiz}/questions/{question}      -> edit soal
//   DELETE /admin/quizzes/{quiz}/questions/{question}      -> hapus soal
// Sesuaikan konstanta di bawah kalau path asli backend berbeda.
const QUIZ_ENDPOINTS = {
  getByYear: (yearId) => `/admin/years/${yearId}/quiz`,
  quiz: (quizId) => `/admin/quizzes/${quizId}`,
  questions: (quizId) => `/admin/quizzes/${quizId}/questions`,
  question: (quizId, questionId) => `/admin/quizzes/${quizId}/questions/${questionId}`,
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda' },
  { value: 'essay', label: 'Esai' },
];

const MAX_QUESTIONS = 5;

const EMPTY_QUESTION_FORM = {
  question: '',
  type: 'multiple_choice',
  correct_answer: '',
  options: [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
  ],
};

export default function QuizManager() {
  const { confirm, dialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [eras, setEras] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedEraId, setSelectedEraId] = useState(null);
  const [selectedYearId, setSelectedYearId] = useState(searchParams.get('year') || null);

  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingEras, setLoadingEras] = useState(true);
  const [error, setError] = useState(null);

  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => {
    fetchEras();
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      setSearchParams({ year: selectedYearId }, { replace: true });
      loadQuiz(selectedYearId);
    } else {
      setQuiz(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId]);

  async function fetchEras() {
    setLoadingEras(true);
    try {
      const res = await api.get('/admin/eras');
      setEras(res.data);
    } catch (err) {
      setError('Gagal memuat daftar era.');
    } finally {
      setLoadingEras(false);
    }
  }

  async function fetchYears(eraId) {
    try {
      const res = await api.get('/admin/years', { params: { era_id: eraId } });
      setYears(res.data);
    } catch (err) {
      setError('Gagal memuat daftar tahun.');
    }
  }

  function selectEra(era) {
    setSelectedEraId(era.id);
    setSelectedYearId(null);
    fetchYears(era.id);
  }

  const loadQuiz = useCallback(async (yearId) => {
    setLoadingQuiz(true);
    setError(null);
    resetQuestionForm();
    try {
      const res = await api.get(QUIZ_ENDPOINTS.getByYear(yearId));
      setQuiz(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat kuis untuk tahun ini.');
      setQuiz(null);
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  async function togglePublish() {
    if (!quiz) return;
    setError(null);
    try {
      const res = await api.put(QUIZ_ENDPOINTS.quiz(quiz.id), { is_published: !quiz.is_published });
      setQuiz(res.data);
    } catch (err) {
      // R-QUIZ-05: publish ditolak kalau belum ada soal / years.summary kosong
      setError(err.response?.data?.message || 'Gagal mengubah status publish kuis.');
    }
  }

  function openAddQuestionForm() {
    resetQuestionForm();
    setShowQuestionForm(true);
  }

  function resetQuestionForm() {
    setEditingQuestionId(null);
    setQuestionForm(EMPTY_QUESTION_FORM);
    setShowQuestionForm(false);
  }

  function startEditQuestion(q) {
    setEditingQuestionId(q.id);
    setQuestionForm({
      question: q.question || '',
      type: q.type,
      correct_answer: q.correct_answer || '',
      options: q.type === 'multiple_choice' && q.options?.length
        ? q.options.map((o) => ({ option_text: o.option_text, is_correct: !!o.is_correct }))
        : EMPTY_QUESTION_FORM.options,
    });
    setShowQuestionForm(true);
  }

  function updateOption(index, field, value) {
    setQuestionForm((prev) => {
      const options = [...prev.options];
      if (field === 'is_correct') {
        // hanya satu opsi benar (R-QUIZ-07)
        options.forEach((o, i) => { o.is_correct = i === index; });
      } else {
        options[index] = { ...options[index], [field]: value };
      }
      return { ...prev, options };
    });
  }

  function addOption() {
    setQuestionForm((prev) => ({
      ...prev,
      options: [...prev.options, { option_text: '', is_correct: false }],
    }));
  }

  function removeOption(index) {
    setQuestionForm((prev) => {
      const options = prev.options.filter((_, i) => i !== index);
      // pastikan tetap ada tepat satu is_correct kalau opsi yang dihapus itu yang benar
      if (!options.some((o) => o.is_correct) && options.length > 0) options[0].is_correct = true;
      return { ...prev, options };
    });
  }

  async function handleQuestionSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        question: questionForm.question,
        type: questionForm.type,
        correct_answer: questionForm.type === 'essay' ? (questionForm.correct_answer || null) : null,
        options: questionForm.type === 'multiple_choice'
          ? questionForm.options
              .filter((o) => o.option_text.trim() !== '')
              .map((o, i) => ({ option_text: o.option_text, is_correct: o.is_correct, order: i + 1 }))
          : [],
      };
      if (editingQuestionId) {
        await api.patch(QUIZ_ENDPOINTS.question(quiz.id, editingQuestionId), payload);
      } else {
        await api.post(QUIZ_ENDPOINTS.questions(quiz.id), payload);
      }
      resetQuestionForm();
      loadQuiz(selectedYearId);
    } catch (err) {
      // R-QUIZ-06 (maks 5 soal) & R-QUIZ-07 (multiple_choice wajib tepat 1 is_correct) divalidasi backend
      setError(err.response?.data?.message || 'Gagal menyimpan soal.');
    }
  }

  async function handleDeleteQuestion(q) {
    const ok = await confirm({ title: 'Hapus soal ini?', description: 'Opsi jawabannya (jika ada) ikut terhapus.' });
    if (!ok) return;
    try {
      await api.delete(QUIZ_ENDPOINTS.question(quiz.id, q.id));
      loadQuiz(selectedYearId);
    } catch (err) {
      setError('Gagal menghapus soal.');
    }
  }

  const questions = quiz?.questions || [];
  const questionCount = questions.length;
  const canAddQuestion = questionCount < MAX_QUESTIONS;
  const selectedEra = eras.find((e) => e.id === selectedEraId) || null;
  const selectedYear = years.find((y) => y.id === Number(selectedYearId)) || null;

  return (
    <div className="space-y-6">
      {dialog}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kelola Kuis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kuis custom internal per wabah (year) — wajib dikerjakan user, tanpa skor/auto-grading (R-QUIZ-01–04).
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        {/* ---------- Navigator: Era -> Tahun ---------- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilih Era</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingEras ? (
                <p className="text-sm text-muted-foreground">Memuat...</p>
              ) : (
                eras.map((era) => {
                  const accent = getEraAccent(era.slug);
                  return (
                    <button
                      key={era.id}
                      onClick={() => selectEra(era)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        selectedEraId === era.id ? 'border-primary/40 bg-secondary' : 'hover:bg-secondary/50'
                      )}
                    >
                      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent.hex }} />
                      {era.name}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {selectedEraId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Tahun</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {years.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada tahun di era ini.</p>
                ) : (
                  years.map((year) => (
                    <button
                      key={year.id}
                      onClick={() => setSelectedYearId(year.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        Number(selectedYearId) === year.id ? 'border-primary/40 bg-secondary' : 'hover:bg-secondary/50'
                      )}
                    >
                      <span>{year.year} — {year.title}</span>
                      {year.quiz?.is_published && <Badge variant="success">Kuis Published</Badge>}
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---------- Workspace Kuis untuk Tahun Terpilih ---------- */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                {selectedYear ? `Kuis — ${selectedYear.year} ${selectedYear.title}` : 'Kuis'}
              </CardTitle>
              <CardDescription className="mt-1">
                {!selectedYearId
                  ? 'Pilih era lalu tahun di kiri untuk mengelola kuisnya.'
                  : `${questionCount}/${MAX_QUESTIONS} soal. Publish butuh minimal 1 soal & rangkuman tahun terisi (R-QUIZ-05).`}
              </CardDescription>
            </div>
            {quiz && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePublish}
                title={quiz.is_published ? 'Unpublish' : 'Publish'}
              >
                {quiz.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {quiz.is_published ? 'Unpublish' : 'Publish'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedYearId ? (
              <p className="text-sm text-muted-foreground">Belum ada tahun terpilih.</p>
            ) : loadingQuiz ? (
              <p className="text-sm text-muted-foreground">Memuat...</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant={quiz?.is_published ? 'success' : 'secondary'}>
                    {quiz?.is_published ? 'Published' : 'Draft'}
                  </Badge>
                  {!showQuestionForm && canAddQuestion && (
                    <Button size="sm" onClick={openAddQuestionForm}>
                      <Plus className="h-4 w-4" /> Tambah Soal
                    </Button>
                  )}
                </div>

                {!canAddQuestion && !showQuestionForm && (
                  <p className="text-xs text-muted-foreground">
                    Sudah mencapai maksimal {MAX_QUESTIONS} soal (R-QUIZ-06).
                  </p>
                )}

                {showQuestionForm && (
                  <form onSubmit={handleQuestionSubmit} className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{editingQuestionId ? 'Edit Soal' : 'Soal Baru'}</p>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={resetQuestionForm}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Tipe Soal</Label>
                      <Select
                        value={questionForm.type}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, type: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Pertanyaan</Label>
                      <Textarea
                        value={questionForm.question}
                        onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>

                    {questionForm.type === 'multiple_choice' ? (
                      <div className="space-y-2">
                        <Label>Opsi Jawaban (pilih satu yang benar)</Label>
                        {questionForm.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct-option"
                              checked={opt.is_correct}
                              onChange={() => updateOption(i, 'is_correct', true)}
                              className="h-4 w-4 accent-foreground"
                            />
                            <Input
                              value={opt.option_text}
                              onChange={(e) => updateOption(i, 'option_text', e.target.value)}
                              placeholder={`Opsi ${i + 1}`}
                              required
                            />
                            {questionForm.options.length > 2 && (
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(i)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addOption}>
                          <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>Referensi Jawaban (opsional, tidak untuk auto-grading — R-QUIZ-07)</Label>
                        <Textarea
                          value={questionForm.correct_answer}
                          onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button type="submit" size="sm">{editingQuestionId ? 'Update Soal' : 'Tambah Soal'}</Button>
                      <Button type="button" variant="outline" size="sm" onClick={resetQuestionForm}>Batal</Button>
                    </div>
                  </form>
                )}

                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada soal.</p>
                ) : (
                  <ul className="space-y-2">
                    {questions.map((q, i) => (
                      <li key={q.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Soal {i + 1}</span>
                              <Badge variant="secondary">
                                {QUESTION_TYPES.find((t) => t.value === q.type)?.label || q.type}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm">{q.question}</p>
                            {q.type === 'multiple_choice' && q.options?.length > 0 && (
                              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                                {q.options.map((o) => (
                                  <li key={o.id} className={o.is_correct ? 'font-medium text-foreground' : ''}>
                                    {o.is_correct ? '✓ ' : '– '}{o.option_text}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditQuestion(q)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteQuestion(q)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}