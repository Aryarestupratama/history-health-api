<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserCaseStudyAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'case_study_id',
        'slot_1_option_id',
        'slot_2_option_id',
        'slot_3_option_id',
        'reason',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function caseStudy()
    {
        return $this->belongsTo(CaseStudy::class);
    }

    public function slot1Option()
    {
        return $this->belongsTo(CaseStudyOption::class, 'slot_1_option_id');
    }

    public function slot2Option()
    {
        return $this->belongsTo(CaseStudyOption::class, 'slot_2_option_id');
    }

    public function slot3Option()
    {
        return $this->belongsTo(CaseStudyOption::class, 'slot_3_option_id');
    }

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    /**
     * BEDA PENTING dari UserYearSummaryCompletion::recordCompletion() —
     * di sana completed_at SELALU ditimpa ke now() tiap panggilan (retake
     * boleh mengubah timestamp). Di sini TIDAK:
     *
     * - Slot 1/2/3 & `reason` SELALU ditimpa ke submission terbaru,
     *   terlepas benar/salah (progress.md: "draft tidak disimpan, hanya
     *   hasil submit" — jadi row ini SELALU mencerminkan submit TERAKHIR).
     * - `completed_at` HANYA di-set kalau belum pernah terisi DAN
     *   submission kali ini benar ($isCorrect true). Begitu terisi, TIDAK
     *   PERNAH ditimpa lagi (baik oleh submit salah berikutnya, MAUPUN
     *   oleh submit benar berikutnya) — badge yang sudah didapat permanen,
     *   termasuk timestamp kapan pertama kali didapat.
     *
     * Dipanggil dari CaseStudyService::submit() setelah evaluasi hard-order
     * selesai di server (bukan dipercaya dari payload client).
     *
     * @param array{1:int,2:int,3:int} $slotOptionIds keyed 1/2/3 sesuai slot prioritas
     */
    public static function recordAttempt(
        int $userId,
        int $caseStudyId,
        array $slotOptionIds,
        string $reason,
        bool $isCorrect,
    ): self {
        $existing = self::query()
            ->where('user_id', $userId)
            ->where('case_study_id', $caseStudyId)
            ->first();

        $completedAt = $existing?->completed_at;

        if ($isCorrect && $completedAt === null) {
            $completedAt = now();
        }

        return self::updateOrCreate(
            ['user_id' => $userId, 'case_study_id' => $caseStudyId],
            [
                'slot_1_option_id' => $slotOptionIds[1],
                'slot_2_option_id' => $slotOptionIds[2],
                'slot_3_option_id' => $slotOptionIds[3],
                'reason' => $reason,
                'completed_at' => $completedAt,
            ]
        );
    }
}