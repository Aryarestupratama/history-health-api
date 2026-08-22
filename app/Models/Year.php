<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Year extends Model
{
    use HasFactory;

    protected $fillable = [
        'era_id',
        'year',
        'title',
    ];

    public function era()
    {
        return $this->belongsTo(Era::class);
    }

    public function sections()
    {
        return $this->hasMany(Section::class);
    }
}