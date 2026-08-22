<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserCardUnlock extends Model
{
    use HasFactory;

    protected $table = 'user_card_unlocks';

    public $timestamps = false; // hanya punya unlocked_at

    protected $fillable = [
        'user_id',
        'figure_id',
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

    public function figure()
    {
        return $this->belongsTo(Figure::class);
    }
}