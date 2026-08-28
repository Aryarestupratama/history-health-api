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
    ];

    protected function casts(): array
    {
        return [
            'unlocked_at' => 'datetime',
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
}