import { Lock, CheckCircle2, FileText, Image as ImageIcon, Youtube, FileWarning, Sparkles } from "lucide-react";
import { PALETTE, ERA_ACCENTS } from "@/config/branding";

/**
 * <PhonePreview screen="roadmap" data={...} />
 *
 * Preview HP live untuk Content Studio (Design.md §4.3). Dipakai di dalam
 * WabahWorkspace, di-refresh dari state form (client-side), bukan menunggu
 * tombol Simpan. Tidak melakukan API call sendiri — semua data dikirim
 * lewat prop `data` oleh parent.
 *
 * Props:
 * - screen: "roadmap" | "section-detail" | "summary" | "quiz"
 * - data: bentuk berbeda tergantung `screen`, lihat masing-masing shape di bawah.
 * - eraSlug: opsional, untuk aksen warna era (kolonial/kemerdekaan/modern)
 */
export default function PhonePreview({ screen, data, eraSlug }) {
  const accent = ERA_ACCENTS?.[eraSlug]?.hex ?? PALETTE.ink;

  return (
    <div className="sticky top-4 flex flex-col items-center">
      <PhoneFrame>
        <StatusBar />
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {screen === "roadmap" && <RoadmapScreen data={data} accent={accent} />}
          {screen === "section-detail" && <SectionDetailScreen data={data} accent={accent} />}
          {screen === "summary" && <SummaryScreen data={data} accent={accent} />}
          {screen === "quiz" && <QuizScreen data={data} accent={accent} />}
          {!screen && <EmptyState />}
        </div>
      </PhoneFrame>
      <p className="mt-3 text-xs text-zinc-400">Preview live &middot; menyesuaikan saat kamu mengetik</p>
    </div>
  );
}

/* ---------------------------------------------------------- Frame & chrome */

function PhoneFrame({ children }) {
  return (
    <div className="relative flex h-[640px] w-[300px] flex-col overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-900 bg-white shadow-xl">
      <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-zinc-900" />
      {children}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pb-1 pt-2 text-[10px] font-medium text-zinc-500">
      <span>9:41</span>
      <span className="tracking-wide">SEKALA</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-300">
      <FileWarning size={28} />
      <p className="text-xs">Belum ada yang diedit</p>
    </div>
  );
}

/* ------------------------------------------------------------- Roadmap tab */
// data: { yearTitle, yearNumber, sections: [{ id, title, order, isPublished, locked }], activeId? }

function RoadmapScreen({ data, accent }) {
  const sections = data?.sections ?? [];
  return (
    <div>
      <p className="text-xs font-medium text-zinc-400">{data?.yearNumber ?? "—"}</p>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">{data?.yearTitle || "Judul wabah"}</h2>

      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Belum ada section
        </p>
      )}

      <ol className="space-y-2">
        {sections
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((s, i) => {
            const isActive = s.id === data?.activeId;
            return (
              <li
                key={s.id ?? i}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  isActive ? "border-transparent text-white shadow-sm" : "border-zinc-100 bg-zinc-50"
                }`}
                style={isActive ? { backgroundColor: accent } : undefined}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive ? "bg-white/25 text-white" : "bg-white text-zinc-500"
                  }`}
                >
                  {s.order ?? i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {s.title || "(belum diberi judul)"}
                  {!s.isPublished && (
                    <span className={`ml-2 text-[10px] font-normal ${isActive ? "text-white/70" : "text-zinc-400"}`}>
                      draft
                    </span>
                  )}
                </span>
                {s.locked ? (
                  <Lock size={16} className={isActive ? "text-white/80" : "text-zinc-300"} />
                ) : (
                  <CheckCircle2 size={16} className={isActive ? "text-white/80" : "text-emerald-400"} />
                )}
              </li>
            );
          })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------- Section detail */
// data: { sectionTitle, blocks: [{ id, type: 'text'|'image'|'video'|'pdf', content, resolvedUrl }] }

function SectionDetailScreen({ data, accent }) {
  const blocks = data?.blocks ?? [];
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-zinc-900">{data?.sectionTitle || "Judul section"}</h2>
      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Belum ada blok konten
        </p>
      )}
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <BlockPreview key={b.id ?? i} block={b} accent={accent} />
        ))}
      </div>
    </div>
  );
}

function BlockPreview({ block, accent }) {
  switch (block.type) {
    case "text":
      return (
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
          {block.content || <span className="text-zinc-300">Teks kosong</span>}
        </p>
      );
    case "image":
      return block.resolvedUrl ? (
        <img src={block.resolvedUrl} alt="" className="w-full rounded-lg border border-zinc-100 object-cover" />
      ) : (
        <MediaPlaceholder icon={<ImageIcon size={18} />} label="Link gambar belum valid" accent={accent} />
      );
    case "video":
      return block.resolvedUrl ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-100 bg-black">
          <img src={block.resolvedUrl} alt="" className="h-full w-full object-cover opacity-80" />
          <Youtube size={28} className="absolute inset-0 m-auto text-white drop-shadow" />
        </div>
      ) : (
        <MediaPlaceholder icon={<Youtube size={18} />} label="Link YouTube belum valid" accent={accent} />
      );
    case "pdf":
      return (
        <MediaPlaceholder
          icon={<FileText size={18} />}
          label={block.resolvedUrl ? "Dokumen PDF" : "Link PDF belum valid"}
          accent={accent}
        />
      );
    default:
      return null;
  }
}

function MediaPlaceholder({ icon, label, accent }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-400">
      <span style={{ color: accent }}>{icon}</span>
      {label}
    </div>
  );
}

/* ------------------------------------------------------------- Summary tab */
// data: { summary, vaccines: [{ id, name, photo }], showUnlockAnimation }

function SummaryScreen({ data, accent }) {
  const vaccines = data?.vaccines ?? [];
  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-zinc-900">Rangkuman Wabah</h2>
      <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
        {data?.summary || <span className="text-zinc-300">Rangkuman belum diisi</span>}
      </p>

      {data?.showUnlockAnimation && vaccines.length > 0 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl p-3 text-white shadow-sm"
          style={{ backgroundColor: PALETTE.purple }}
        >
          <Sparkles size={18} />
          <span className="text-sm font-medium">Vaksin baru terbuka!</span>
        </div>
      )}

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Vaksin terkait</p>
      {vaccines.length === 0 && <p className="text-xs text-zinc-300">Belum ada vaksin di-assign</p>}
      <div className="grid grid-cols-3 gap-2">
        {vaccines.map((v, i) => (
          <div key={v.id ?? i} className="flex flex-col items-center gap-1">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-zinc-100 bg-zinc-50">
              {v.photo ? (
                <img src={v.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-zinc-300">?</span>
              )}
            </div>
            <span className="line-clamp-2 text-center text-[10px] text-zinc-500">{v.name || "Vaksin"}</span>
          </div>
        ))}
      </div>

      <button
        className="mt-6 w-full rounded-lg py-2.5 text-sm font-medium text-white"
        style={{ backgroundColor: accent }}
      >
        Kerjakan Kuis
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- Quiz tab */
// data: { questions: [{ id, question, type, options: [{ option_text, is_correct }] }], activeIndex }
//
// Semua soal ditampilkan berurutan dalam 1 layar scrollable (bukan 1 soal
// per layar dengan navigasi index) — selaras rencana model Flutter yang
// juga scrollable form, bukan swipe per-soal. `activeIndex` dipakai untuk
// highlight soal yang sedang diedit admin di editor kiri, supaya preview
// tetap kasih konteks "lagi ngedit yang mana".

function QuizScreen({ data, accent }) {
  const questions = data?.questions ?? [];
  const activeIndex = data?.activeIndex;

  return (
    <div>
      <p className="mb-3 text-xs font-medium text-zinc-400">
        {questions.length} soal
      </p>

      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400">
          Belum ada soal
        </p>
      ) : (
        <div className="space-y-5">
          {questions.map((q, i) => (
            <div
              key={q.id ?? i}
              className="rounded-xl p-3 transition"
              style={i === activeIndex ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
            >
              <p className="mb-2 text-xs font-semibold" style={{ color: accent }}>
                Soal {i + 1}
              </p>
              <p className="mb-3 text-sm font-medium leading-relaxed text-zinc-900">
                {q.question || <span className="text-zinc-300">Teks soal kosong</span>}
              </p>

              {q.type === "multiple_choice" ? (
                <div className="space-y-2">
                  {(q.options ?? []).length === 0 && (
                    <p className="text-xs text-zinc-300">Belum ada opsi jawaban</p>
                  )}
                  {(q.options ?? []).map((opt, oi) => (
                    <div
                      key={oi}
                      className="flex items-center gap-2 rounded-lg border border-zinc-100 p-2.5 text-sm text-zinc-700"
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                        style={{ borderColor: accent }}
                      />
                      {/* FIX: API balikin 'option_text' (snake_case, lihat
                          Schema.md & QuizController), sebelumnya kode di
                          sini baca 'optionText' (camelCase) yang selalu
                          undefined -> opsi kelihatan "kosong" terus walau
                          sudah diisi teksnya di editor. */}
                      {opt.option_text || <span className="text-zinc-300">Opsi kosong</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-100 p-3 text-xs text-zinc-300">
                  Jawaban esai (input teks bebas)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="mt-6 w-full rounded-lg py-2.5 text-sm font-medium text-white"
        style={{ backgroundColor: accent }}
        disabled
      >
        Kuis selesai dikerjakan
      </button>
      <p className="mt-2 text-center text-[10px] text-zinc-300">Tanpa tampilan skor (R-QUIZ-04)</p>
    </div>
  );
}