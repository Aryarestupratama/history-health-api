<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Figure extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'photo',
        'birth_date',
        'death_date',
        'family',
        'role_description',
    ];

    protected function casts(): array
    {
        return [
            // Format eksplisit 'Y-m-d' agar toArray()/toJSON() (dipakai
            // admin FigureController & FigureManager.jsx) mengeluarkan
            // "1886-03-03" murni, bukan ISO datetime penuh
            // ("...T16:52:48.000000Z") seperti default cast 'date' polos.
            // FigureDetailResource tidak terdampak karena tetap memanggil
            // ->toDateString() secara eksplisit.
            'birth_date' => 'date:Y-m-d',
            'death_date' => 'date:Y-m-d',
        ];
    }

    protected $appends = ['photo_url'];

    public function sections()
    {
        return $this->belongsToMany(Section::class, 'section_figure');
    }

    public function unlocks()
    {
        return $this->hasMany(UserCardUnlock::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return app(LinkParserService::class)->toDriveImageUrl($this->photo);
    }
}