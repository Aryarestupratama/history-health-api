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
            [
                'era_id' => $kolonial->id,
                'year' => 1918,
                'title' => 'Wabah Flu Spanyol',
                'summary' => 'Flu Spanyol melanda Hindia Belanda pada 1918, menewaskan ratusan ribu jiwa dan mendorong perubahan kebijakan kesehatan publik kolonial.',
            ],
            [
                'era_id' => $kolonial->id,
                'year' => 1927,
                'title' => 'Berdirinya Sekolah Kedokteran STOVIA',
                'summary' => 'STOVIA menjadi cikal bakal pendidikan kedokteran modern di Hindia Belanda sekaligus tempat lahirnya kesadaran pergerakan nasional di kalangan dokter pribumi.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1948,
                'title' => 'Wabah Cacar Pasca Kemerdekaan',
                'summary' => 'Di tengah gejolak pasca kemerdekaan, wabah cacar mendorong pemerintah muda RI menjalankan program vaksinasi massal pertama.',
            ],
            [
                'era_id' => $kemerdekaan->id,
                'year' => 1968,
                'title' => 'Program Puskesmas Pertama',
                'summary' => 'Puskesmas mulai diperkenalkan sebagai ujung tombak layanan kesehatan dasar masyarakat di seluruh Indonesia.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2003,
                'title' => 'Wabah SARS di Indonesia',
                'summary' => 'SARS menjadi peringatan dini pentingnya sistem surveilans penyakit menular lintas negara bagi Indonesia.',
            ],
            [
                'era_id' => $modern->id,
                'year' => 2020,
                'title' => 'Pandemi COVID-19',
                'summary' => 'Pandemi COVID-19 mengubah total kebijakan kesehatan, mendorong percepatan vaksinasi nasional dan transformasi layanan kesehatan digital.',
            ],
        ];

        foreach ($years as $year) {
            Year::updateOrCreate(
                ['era_id' => $year['era_id'], 'year' => $year['year']],
                $year
            );
        }
    }
}