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
        'summary',
    ];

    public function era()
    {
        return $this->belongsTo(Era::class);
    }

    public function sections()
    {
        return $this->hasMany(Section::class)->orderBy('order');
    }

    public function vaccines()
    {
        return $this->belongsToMany(Vaccine::class, 'year_vaccine');
    }

    public function quiz()
    {
        return $this->hasOne(Quiz::class);
    }
}