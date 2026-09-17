<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class YearSummaryPointOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'year_summary_point_id',
        'option_text',
        'is_correct',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
        ];
    }

    public function point()
    {
        return $this->belongsTo(YearSummaryPoint::class, 'year_summary_point_id');
    }
}