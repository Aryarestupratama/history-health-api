<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\Year;
use Illuminate\Database\Seeder;

class YearSeeder extends Seeder
{
    public function run(): void
    {
        $kolonial = Era::where('slug', 'kolonial')->first();
        $kemerdekaan = Era::where('slug', 'kemerdekaan')->first();
        $modern = Era::where('slug', 'modern')->first();

        $years = [
            ['era_id' => $kolonial->id, 'year' => 1918, 'title' => 'Wabah Flu Spanyol'],
            ['era_id' => $kolonial->id, 'year' => 1927, 'title' => 'Berdirinya Sekolah Kedokteran STOVIA'],
            ['era_id' => $kemerdekaan->id, 'year' => 1948, 'title' => 'Wabah Cacar Pasca Kemerdekaan'],
            ['era_id' => $kemerdekaan->id, 'year' => 1968, 'title' => 'Program Puskesmas Pertama'],
            ['era_id' => $modern->id, 'year' => 2003, 'title' => 'Wabah SARS di Indonesia'],
            ['era_id' => $modern->id, 'year' => 2020, 'title' => 'Pandemi COVID-19'],
        ];

        foreach ($years as $year) {
            Year::updateOrCreate(
                ['era_id' => $year['era_id'], 'year' => $year['year']],
                $year
            );
        }
    }
}