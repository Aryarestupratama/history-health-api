<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserYearSummaryCompletion extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'year_summary_id',
        'is_perfect',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_perfect' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function yearSummary()
    {
        return $this->belongsTo(YearSummary::class);
    }

    /**
     * R-SUM-11: retake meng-overwrite row yang sama (unique per
     * user_id + year_summary_id), bukan riwayat attempt baru. Dipanggil
     * saat user menyelesaikan poin ke-7 (baik pengerjaan pertama maupun
     * "Kerjakan Ulang") — sengaja tidak menyimpan jawaban per poin
     * (lihat catatan di migration & Schema.md §2.22).
     */
    public static function recordCompletion(int $userId, int $yearSummaryId, bool $isPerfect): self
    {
        return self::updateOrCreate(
            ['user_id' => $userId, 'year_summary_id' => $yearSummaryId],
            ['is_perfect' => $isPerfect, 'completed_at' => now()]
        );
    }
}