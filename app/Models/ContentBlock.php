<?php

namespace App\Models;

use App\Services\Content\LinkParserService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContentBlock extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'type',
        'content',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    protected $appends = ['resolved_url'];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    /**
     * URL siap pakai (direct-view/embed) hasil parsing 'content' mentah,
     * sesuai type block. Untuk 'text'/'summary', kembalikan null.
     */
    public function getResolvedUrlAttribute(): ?string
    {
        $parser = app(LinkParserService::class);

        return match ($this->type) {
            'image' => $parser->toDriveImageUrl($this->content),
            'pdf' => $parser->toDrivePdfEmbedUrl($this->content),
            'video' => $parser->toYoutubeEmbedUrl($this->content),
            default => null,
        };
    }
}