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