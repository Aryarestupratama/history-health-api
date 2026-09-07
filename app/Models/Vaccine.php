<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vaccine extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'photo',
        'photo_locked',
        'manufacturer',
        'disease_target',
        'year_introduced',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'year_introduced' => 'integer',
        ];
    }

    protected $appends = ['photo_url', 'photo_locked_url'];

    public function years()
    {
        return $this->belongsToMany(Year::class, 'year_vaccine');
    }

    /**
     * Era unik yang terhubung ke vaksin ini, diturunkan dari years->era
     * (vaccine tidak punya era_id sendiri, cuma relasi ke year).
     * VAC-03: satu vaksin bisa terhubung ke >1 year, secara teori lintas
     * era, jadi ini array bukan single value. Wajib panggil dengan
     * `years.era` sudah di-eager-load (mis. Vaccine::with('years.era'))
     * di controller, kalau tidak akan kena N+1.
     */
    public function getErasAttribute()
    {
        return $this->years
            ->pluck('era')
            ->filter()
            ->unique('id')
            ->values();
    }

    public function unlocks()
    {
        return $this->hasMany(UserVaccineUnlock::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return app(LinkParserService::class)->toDriveImageUrl($this->photo);
    }

    public function getPhotoLockedUrlAttribute(): ?string
    {
        return app(LinkParserService::class)->toDriveImageUrl($this->photo_locked);
    }
}