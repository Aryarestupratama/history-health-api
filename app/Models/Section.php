<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'year_id',
        'title',
        'quiz_link',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
    }

    public function year()
    {
        return $this->belongsTo(Year::class);
    }

    public function contentBlocks()
    {
        return $this->hasMany(ContentBlock::class)->orderBy('order');
    }

    public function figures()
    {
        return $this->belongsToMany(Figure::class, 'section_figure');
    }

    public function progress()
    {
        return $this->hasMany(UserProgress::class);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}