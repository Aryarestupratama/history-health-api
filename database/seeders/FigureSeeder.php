<?php

namespace Database\Seeders;

use App\Models\Figure;
use App\Models\Section;
use Illuminate\Database\Seeder;

class FigureSeeder extends Seeder
{
    public function run(): void
    {
        $figure1 = Figure::updateOrCreate(
            ['name' => 'dr. Cipto Mangunkusumo'],
            [
                'photo' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_FOTO1/view',
                'birth_date' => '1886-03-04',
                'death_date' => '1943-03-08',
                'family' => 'Putra dari keluarga priyayi Jawa.',
                'role_description' => 'Dokter dan tokoh pergerakan nasional yang aktif menangani wabah pes di Jawa.',
            ]
        );

        $figure2 = Figure::updateOrCreate(
            ['name' => 'dr. Marzoeki Mahdi'],
            [
                'photo' => 'https://drive.google.com/file/d/CONTOH_FILE_ID_FOTO2/view',
                'birth_date' => '1892-02-15',
                'death_date' => '1957-05-16',
                'family' => null,
                'role_description' => 'Pelopor kesehatan jiwa modern di Indonesia.',
            ]
        );

        $section1918 = Section::where('title', 'Flu Spanyol di Hindia Belanda')->first();

        if ($section1918) {
            $section1918->figures()->syncWithoutDetaching([$figure1->id, $figure2->id]);
        }
    }
}