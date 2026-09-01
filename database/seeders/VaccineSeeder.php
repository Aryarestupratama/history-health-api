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

        $vaccine2 = Vaccine::updateOrCreate(
            ['name' => 'Vaksin COVID-19 (Sinovac)'],
            [
                'photo' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_VAKSIN2/view',
                'photo_locked' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_VAKSIN2_SILUET/view',
                'manufacturer' => 'Sinovac Biotech / Bio Farma',
                'disease_target' => 'COVID-19',
                'year_introduced' => 2020,
                'description' => 'Vaksin pertama yang digunakan dalam program vaksinasi nasional Indonesia untuk menanggulangi pandemi COVID-19.',
            ]
        );

        $year1918 = Year::where('year', 1918)->first();
        $year2020 = Year::where('year', 2020)->first();

        if ($year1918) {
            $year1918->vaccines()->syncWithoutDetaching([$vaccine1->id]);
        }

        if ($year2020) {
            $year2020->vaccines()->syncWithoutDetaching([$vaccine2->id]);
        }
    }
}