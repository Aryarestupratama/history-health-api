import {
  Lock,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Youtube,
  FileWarning,
  Sparkles,
  Syringe,
  Building2,
  CalendarDays,
} from "lucide-react";
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
 * - screen: "roadmap" | "section-detail" | "summary" | "quiz" | "vaccine-detail"
 * - data: bentuk berbeda tergantung `screen`, lihat masing-masing shape di bawah.
 * - eraSlug: opsional, untuk aksen warna era (kolonial/kemerdekaan/modern)
 * - compact: opsional, perkecil frame HP (dipakai saat preview ada di dalam
 *   modal sempit, mis. dialog preview vaksin — bukan split-screen Content
 *   Studio yang punya ruang lega)
 */
export default function PhonePreview({ screen, data, eraSlug, compact = false }) {
  const accent = ERA_ACCENTS?.[eraSlug]?.hex ?? PALETTE.ink;
  const eraLabel = ERA_ACCENTS?.[eraSlug]?.label ?? null;

  return (
    <div className="sticky top-4 flex flex-col items-center">
      <PhoneFrame compact={compact}>
        <StatusBar />
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden break-words px-4 pb-6 pt-3"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {screen === "roadmap" && <RoadmapScreen data={data} accent={accent} eraLabel={eraLabel} />}
          {screen === "section-detail" && <SectionDetailScreen data={data} accent={accent} eraLabel={eraLabel} />}
          {screen === "summary" && <SummaryScreen data={data} accent={accent} />}
          {screen === "quiz" && <QuizScreen data={data} accent={accent} />}
          {screen === "vaccine-detail" && <VaccineDetailScreen data={data} accent={accent} />}
          {!screen && <EmptyState />}
        </div>
      </PhoneFrame>
      <p className="mt-3 text-xs text-zinc-400">Preview live &middot; menyesuaikan saat kamu mengetik</p>
    </div>
  );
}

/* ---------------------------------------------------------- Frame & chrome */

function PhoneFrame({ children, compact }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[2.5rem] border-[6px] border-zinc-900 bg-white shadow-xl ${
        compact ? 'h-[480px] w-[240px]' : 'h-[640px] w-[300px]'
      }`}
    >
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

function RoadmapScreen({ data, accent, eraLabel }) {
  const sections = data?.sections ?? [];
  return (
    <div>
      {eraLabel && (
        <span
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${accent}26`, color: accent }}
        >
          {eraLabel}
        </span>
      )}
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

function SectionDetailScreen({ data, accent, eraLabel }) {
  const blocks = data?.blocks ?? [];
  return (
    <div>
      {eraLabel && (
        <span
          className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${accent}26`, color: accent }}
        >
          {eraLabel}
        </span>
      )}
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
  // FIX: API (ContentBlockResource) balikin 'resolved_url' (snake_case),
  // sebelumnya kode di sini baca 'resolvedUrl' (camelCase) yang selalu
  // undefined -> gambar/pdf/video tidak pernah ke-render, selalu jatuh ke
  // placeholder walau link sudah valid.
  const resolvedUrl = block.resolved_url;

  switch (block.type) {
    case "text":
      return (
        <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
          {block.content || <span className="text-zinc-300">Teks kosong</span>}
        </p>
      );
    case "image":
      return resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full rounded-lg border border-zinc-100 object-cover"
        />
      ) : (
        <MediaPlaceholder icon={<ImageIcon size={18} />} label="Link gambar belum valid" accent={accent} />
      );
    case "video":
      // FIX: resolved_url untuk type=video adalah YouTube EMBED URL
      // (https://www.youtube.com/embed/VIDEO_ID, lihat
      // LinkParserService::toYoutubeEmbedUrl()) -- ini format untuk
      // <iframe>, bukan URL gambar. Sebelumnya dipakai sebagai src <img>
      // (mengira ini thumbnail) sehingga selalu broken image walau field
      // sudah benar. Diganti <iframe> supaya admin lihat player asli
      // (selaras Design.md §4.3: "render thumbnail/embed asli").
      return resolvedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-100 bg-black">
          <iframe
            src={resolvedUrl}
            title="Preview video"
            className="h-full w-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <MediaPlaceholder icon={<Youtube size={18} />} label="Link YouTube belum valid" accent={accent} />
      );
    case "pdf":
      // FIX: sebelumnya cuma tampilkan label "Dokumen PDF" tanpa pernah
      // benar-benar render isi dokumen. resolved_url untuk type=pdf sudah
      // berupa URL preview siap-embed Google Drive
      // (drive.google.com/file/d/{id}/preview, lihat
      // LinkParserService::toDrivePdfEmbedUrl()) -- di-iframe supaya admin
      // langsung lihat isi PDF-nya, bukan cuma label statis.
      return resolvedUrl ? (
        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
          <iframe src={resolvedUrl} title="Preview PDF" className="h-full w-full" frameBorder="0" />
        </div>
      ) : (
        <MediaPlaceholder icon={<FileText size={18} />} label="Link PDF belum valid" accent={accent} />
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
// data: { questions: [{ id, question, options: [{ option_text, is_correct }] }], activeIndex }
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

              <div className="space-y-2">
                {(q.options ?? []).length === 0 && (
                  <p className="text-xs text-zinc-300">Belum ada opsi jawaban</p>
                )}
                {(q.options ?? []).map((opt, oi) => (
                  <div
                    key={oi}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm ${
                      opt.is_correct
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-100 text-zinc-700"
                    }`}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: opt.is_correct ? "#4BA95F" : accent }}
                    />
                    {/* FIX: API balikin 'option_text' (snake_case, lihat
                        Schema.md & QuizController), sebelumnya kode di
                        sini baca 'optionText' (camelCase) yang selalu
                        undefined -> opsi kelihatan "kosong" terus walau
                        sudah diisi teksnya di editor. */}
                    <span className="flex-1">
                      {opt.option_text || <span className="text-zinc-300">Opsi kosong</span>}
                    </span>
                    {opt.is_correct && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                        Benar
                      </span>
                    )}
                  </div>
                ))}
                {(q.options ?? []).length > 0 && (
                  <p className="pt-0.5 text-[10px] text-zinc-300">
                    Simulasi feedback ke user setelah menjawab — highlight ini muncul instan per
                    soal, bukan skor akhir
                  </p>
                )}
              </div>
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
      <p className="mt-2 text-center text-[10px] text-zinc-300">Tanpa tampilan skor</p>
    </div>
  );
}

/* ------------------------------------------------------------ Vaccine tab */
// data: { name, photo (raw drive link, dipakai fallback), resolvedPhotoUrl,
//         manufacturer, diseaseTarget, yearIntroduced, description, locked }
//
// `locked` (default false) mensimulasikan tampilan siluet/placeholder saat
// vaksin belum di-unlock user (Design.md §3.4, R-VAC-04) — berguna buat
// admin cek dua kondisi tampilan (terkunci vs terbuka) dari 1 form yang sama,
// tanpa perlu 2 layar preview terpisah.

function VaccineDetailScreen({ data, accent }) {
  const {
    name,
    resolvedPhotoUrl,
    resolvedPhotoLockedUrl,
    manufacturer,
    diseaseTarget,
    yearIntroduced,
    description,
    locked = false,
  } = data ?? {};

  return (
    <div>
      <span
        className="mb-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
        style={{ backgroundColor: `${PALETTE.purple}26`, color: PALETTE.purple }}
      >
        Koleksi Vaksin
      </span>

      <div className="mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
        {locked ? (
          resolvedPhotoLockedUrl ? (
            <img
              src={resolvedPhotoLockedUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-300">
              <Lock size={32} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Belum terbuka</span>
              <span className="text-[9px]">(link foto siluet belum diisi)</span>
            </div>
          )
        ) : resolvedPhotoUrl ? (
          <img
            src={resolvedPhotoUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-300">
            <Syringe size={32} />
            <span className="text-[10px]">Link foto belum valid</span>
          </div>
        )}
      </div>

      <h2 className="mb-1 text-base font-semibold text-zinc-900">
        {locked ? "???" : name || "Nama vaksin"}
      </h2>

      {locked ? (
        <p className="mb-4 text-xs text-zinc-400">
          Selesaikan seluruh section &amp; kuis wabah terkait untuk membuka detail vaksin ini.
        </p>
      ) : (
        <>
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Building2 size={14} style={{ color: accent }} />
              <span>{manufacturer || <span className="text-zinc-300">Produsen belum diisi</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Syringe size={14} style={{ color: accent }} />
              <span>{diseaseTarget || <span className="text-zinc-300">Penyakit target belum diisi</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CalendarDays size={14} style={{ color: accent }} />
              <span>{yearIntroduced || <span className="text-zinc-300">Tahun belum diisi</span>}</span>
            </div>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Deskripsi</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
            {description || <span className="text-zinc-300">Deskripsi belum diisi</span>}
          </p>
        </>
      )}
    </div>
  );
}