<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * REVISI BESAR: kuis sumatif era TIDAK LAGI punya bank soal sendiri.
 * Soal ditarik LANGSUNG dari `quiz_questions` (bank formatif) milik
 * SETIAP year dalam era ini, digabung, lalu didistribusikan +
 * dirandomize saat user membuka kuis (lihat randomQuestions() di bawah).
 * Model/migration `EraQuizQuestion`/`EraQuizQuestionOption` DIHAPUS TOTAL.
 */
class EraQuiz extends Model
{
    use HasFactory;

    /**
     * Total soal yang dikerjakan user per attempt — TETAP 20, TIDAK
     * berubah walau jumlah year per era beda-beda (3/4/5 year). 20 ini
     * didistribusikan PROPORSIONAL ke tiap year (lihat
     * questionQuotaPerYear()), bukan diambil rata dari 1 pool flat lagi.
     */
    public const ATTEMPT_QUESTION_COUNT = 20;

    /**
     * Nilai minimum kelulusan kuis sumatif, dalam persen.
     */
    public const PASSING_GRADE_PERCENTAGE = 75;

    protected $fillable = [
        'era_id',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    public function era()
    {
        return $this->belongsTo(Era::class);
    }

    public function attempts()
    {
        return $this->hasMany(UserEraQuizAttempt::class);
    }

    /**
     * R-ERAQUIZ-10 (REVISI TOTAL): syarat publish sekarang BUKAN lagi
     * angka pool tertentu — melainkan SEMUA year dalam era ini sudah
     * punya kuis formatif yang published (otomatis berarti tepat 10 soal
     * lengkap per year, karena Quiz::canPublish() sudah mensyaratkan itu).
     * 20 soal per attempt jadi konsekuensi otomatis dari distribusi
     * proporsional (questionQuotaPerYear()), bukan syarat eksplisit lagi.
     */
    public function canPublish(): bool
    {
        $years = $this->era->years;

        if ($years->isEmpty()) {
            return false;
        }

        return $years->every(fn ($year) => $year->quiz && $year->quiz->is_published);
    }

    /**
     * R-ERAQUIZ-11 (baru): distribusi kuota soal per year — total SELALU
     * ATTEMPT_QUESTION_COUNT (20), dibagi rata ke N year dalam era ini.
     * Kalau tidak habis dibagi rata, sisanya (20 % N) didistribusikan ke
     * year-year PERTAMA (urut by id) — mis. 3 year -> 7,7,6 (bukan 6,6,8
     * atau pola lain). Dipakai randomQuestions() untuk tahu berapa soal
     * yang perlu diambil dari tiap year.
     *
     * @return array<int, int> [year_id => kuota]
     */
    public function questionQuotaPerYear(): array
    {
        $years = $this->era->years()->orderBy('id')->get();
        $n = $years->count();

        if ($n === 0) {
            return [];
        }

        $base = intdiv(self::ATTEMPT_QUESTION_COUNT, $n);
        $remainder = self::ATTEMPT_QUESTION_COUNT % $n;

        $quotas = [];
        foreach ($years->values() as $i => $year) {
            $quotas[$year->id] = $base + ($i < $remainder ? 1 : 0);
        }

        return $quotas;
    }

    /**
     * R-ERAQUIZ-11: ambil ATTEMPT_QUESTION_COUNT (20) soal TOTAL — sekian
     * soal per year sesuai questionQuotaPerYear(), diacak dalam masing-
     * masing year DAN diacak lagi urutan gabungannya, supaya soal dari
     * year berbeda tidak selalu berurutan per blok. Dipanggil ulang setiap
     * kali user MEMULAI kuis sumatif (termasuk retake), jadi soal & urutan
     * bisa beda tiap attempt.
     */
    public function randomQuestions()
    {
        $quotas = $this->questionQuotaPerYear();
        // FIX (bug: "Method Illuminate\Support\Collection::load does not
        // exist"): collect() bikin plain Support\Collection — begitu
        // di-merge() dengan hasil query Eloquent, tipenya TETAP
        // Support\Collection (bukan Eloquent\Collection), padahal
        // Eloquent\Collection::load() dipanggil di
        // UserEraQuizController::show(). Mulai dari Eloquent\Collection
        // kosong dari awal supaya merge() mempertahankan tipe yang benar.
        // Sekalian eager-load 'options' di sini (bukan lewat ->load()
        // terpisah di controller) supaya method ini aman dipakai di
        // konteks manapun tanpa jebakan tipe koleksi yang sama.
        $questions = new \Illuminate\Database\Eloquent\Collection();

        foreach ($quotas as $yearId => $quota) {
            $quiz = Quiz::where('year_id', $yearId)->first();

            if (! $quiz) {
                continue;
            }

            $questions = $questions->merge(
                $quiz->questions()->with('options')->inRandomOrder()->take($quota)->get()
            );
        }

        return $questions->shuffle()->values();
    }
}