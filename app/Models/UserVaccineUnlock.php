<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserVaccineUnlock extends Model
{
    use HasFactory;

    protected $table = 'user_vaccine_unlocks';

    public $timestamps = false; // hanya punya unlocked_at

    protected $fillable = [
        'user_id',
        'vaccine_id',
        'unlocked_at',
        'seen_at',
    ];

    protected function casts(): array
    {
        return [
            'unlocked_at' => 'datetime',
            'seen_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vaccine()
    {
        return $this->belongsTo(Vaccine::class);
    }

    /**
     * Belum pernah dilihat user di halaman Koleksi Vaksin — dipakai untuk
     * badge dot bottom nav & nentuin vaksin mana yang masih dapat animasi
     * reveal locked->unlocked.
     */
    public function scopeUnseen($query)
    {
        return $query->whereNull('seen_at');
    }

    /**
     * Tandai sudah dilihat. Idempotent: kalau sudah pernah di-mark
     * (seen_at sudah terisi), tidak diubah lagi — supaya timestamp
     * "pertama kali dilihat" tetap konsisten walau endpoint dipanggil
     * berkali-kali (mis. user buka-tutup animasi berulang).
     */
    public function markSeen(): void
    {
        if ($this->seen_at !== null) {
            return;
        }

        $this->forceFill(['seen_at' => now()])->save();
    }
}