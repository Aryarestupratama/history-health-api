<?php

namespace Database\Seeders;

use App\Models\Vaccine;
use App\Models\Year;
use Illuminate\Database\Seeder;

class VaccineSeeder extends Seeder
{
    public function run(): void
    {
        $vaccine1 = Vaccine::updateOrCreate(
            ['name' => 'Vaksin Flu Spanyol (Bacterial)'],
            [
                'photo' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_VAKSIN1/view',
                'photo_locked' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_VAKSIN1_SILUET/view',
                'manufacturer' => 'Berbagai laboratorium kolonial Hindia Belanda',
                'disease_target' => 'Influenza (Flu Spanyol)',
                'year_introduced' => 1918,
                'description' => 'Upaya vaksin bakterial awal yang dikembangkan di tengah wabah, meski efektivitasnya terbatas karena penyebab flu saat itu belum diketahui berasal dari virus.',
            ]
        );

        $year1918 = Year::where('year', 1918)->first();

        if ($year1918) {
            $year1918->vaccines()->syncWithoutDetaching([$vaccine1->id]);
        }

        // Vaccine COVID-19 (year 2020) sengaja tidak di-seed di sini —
        // lihat ModernDummySeeder untuk versi dengan foto locked/unlocked real.
    }
}