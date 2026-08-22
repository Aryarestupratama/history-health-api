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
            'birth_date' => 'date',
            'death_date' => 'date',
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