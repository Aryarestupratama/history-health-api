<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CaseStudy extends Model
{
    use HasFactory;

    /**
     * Jumlah opsi wajib per studi kasus (5 = A-E: 3 prioritas benar + 2
     * pengecoh) — konstanta dipakai di canPublish() & Service, mirror pola
     * Quiz::QUESTION_COUNT / EraQuiz::ATTEMPT_QUESTION_COUNT.
     */
    public const OPTION_COUNT = 5;

    /**
     * Jumlah slot prioritas yang wajib diisi user (Ruang Keputusan) sekaligus
     * jumlah correct_rank valid (1, 2, 3) pada case_study_options.
     */
    public const RANK_SLOTS = 3;

    protected $fillable = [
        'section_id',
        'title',
        'description',
        'challenge_text',
        'reason_description',
        'feedback_correct',
        'feedback_incorrect',
        'badge_name',
        'badge_description',
        'badge_image_link',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function options()
    {
        return $this->hasMany(CaseStudyOption::class)->orderBy('order');
    }

    public function attempts()
    {
        return $this->hasMany(UserCaseStudyAttempt::class);
    }

    /**
     * Syarat publish (rencana, progress.md): tepat 5 opsi, correct_rank
     * 1/2/3 masing-masing tepat satu (2 sisanya null), DAN seluruh kolom
     * teks wajib terisi (title, description, challenge_text,
     * reason_description, feedback_correct, feedback_incorrect, badge_name,
     * badge_image_link — badge_description SENGAJA tidak dicek karena
     * nullable/opsional). Mirror pola YearSummary::canPublish() /
     * Quiz::canPublish().
     *
     * Catatan pemanggilan sama seperti YearSummary::canPublish() — panggil
     * di atas instance yang relasinya sudah fresh, jangan yang di-cache di
     * memory lama.
     */
    public function canPublish(): bool
    {
        $requiredText = [
            $this->title,
            $this->description,
            $this->challenge_text,
            $this->reason_description,
            $this->feedback_correct,
            $this->feedback_incorrect,
            $this->badge_name,
            $this->badge_image_link,
        ];

        foreach ($requiredText as $value) {
            if (blank($value)) {
                return false;
            }
        }

        $options = $this->options()->get();

        if ($options->count() !== self::OPTION_COUNT) {
            return false;
        }

        $ranks = $options->pluck('correct_rank')->filter(fn ($rank) => $rank !== null);

        if ($ranks->count() !== self::RANK_SLOTS) {
            return false;
        }

        // Tepat satu opsi untuk tiap nilai 1, 2, 3 (bukan cuma "3 opsi
        // ber-rank" — harus benar-benar mengisi ketiga slot, tidak boleh
        // ada duplikat/lompat, mis. dua opsi sama-sama rank=1).
        if ($ranks->sort()->values()->all() !== [1, 2, 3]) {
            return false;
        }

        return true;
    }
}