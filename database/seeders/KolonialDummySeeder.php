<?php

namespace Database\Seeders;

use App\Models\Era;
use App\Models\Section;
use App\Models\Vaccine;
use App\Models\Year;
use Illuminate\Database\Seeder;

/**
 * Seeder khusus untuk mengisi SELURUH tahun di era Kolonial dengan data
 * dummy lengkap: 3 section per tahun (masing-masing dengan content blocks),
 * plus 1 vaksin per tahun. Tujuannya untuk testing tampilan roadmap tahun,
 * sequential section unlock, dan collectible card vaksin di aplikasi.
 *
 * Tidak menyentuh SectionSeeder/VaccineSeeder lama (year 1918 & 2020) —
 * bisa dijalankan berdampingan, section/vaccine year 1918 di sini akan
 * di-overwrite (updateOrCreate by title) jadi 3 section, sesuaikan kalau
 * mau tetap pertahankan versi lama.
 */
class KolonialDummySeeder extends Seeder
{
    public function run(): void
    {
        $era = Era::where('slug', 'kolonial')->first();

        if (!$era) {
            $this->command?->warn('Era "kolonial" tidak ditemukan, jalankan EraSeeder & YearSeeder dulu.');
            return;
        }

        $data = [
            1888 => [
                'vaccine' => [
                    'name' => 'Vaksin BCG (Awal Riset Eijkman)',
                    'manufacturer' => 'Lembaga Eijkman, Batavia',
                    'disease_target' => 'Tuberkulosis',
                    'description' => 'Riset awal seputar penyakit menular di Lembaga Eijkman menjadi dasar pengembangan vaksin tuberkulosis di kemudian hari.',
                ],
                'sections' => [
                    'Berdirinya Lembaga Riset Penyakit Menular',
                    'Peran Lembaga Eijkman bagi Kedokteran Kolonial',
                    'Warisan Lembaga Eijkman di Dunia Medis Modern',
                ],
            ],
            1897 => [
                'vaccine' => [
                    'name' => 'Suplemen Vitamin B1 (Thiamin)',
                    'manufacturer' => 'Christiaan Eijkman',
                    'disease_target' => 'Beri-beri',
                    'description' => 'Bukan vaksin dalam arti klasik, namun penemuan Eijkman soal defisiensi vitamin B1 menjadi terobosan pencegahan penyakit beri-beri.',
                ],
                'sections' => [
                    'Fenomena Penyakit Beri-beri di Hindia Belanda',
                    'Eksperimen Eijkman dengan Beras Tumbuk',
                    'Dampak Penemuan Vitamin B1 bagi Dunia',
                ],
            ],
            1902 => [
                'vaccine' => [
                    'name' => 'Vaksin Pes (Yersin-Haffkine)',
                    'manufacturer' => 'Laboratorium Kolonial Batavia',
                    'disease_target' => 'Pes (Plague)',
                    'description' => 'Vaksin pes yang diadaptasi dari metode Yersin-Haffkine digunakan terbatas di wilayah wabah untuk menekan penyebaran.',
                ],
                'sections' => [
                    'Awal Mula Wabah Pes di Jawa',
                    'Upaya Karantina dan Sanitasi Pelabuhan',
                    'Dampak Wabah Pes terhadap Kebijakan Kesehatan',
                ],
            ],
            1911 => [
                'vaccine' => [
                    'name' => 'Vaksin Cacar (Smallpox Vaccine)',
                    'manufacturer' => 'Dinas Kesehatan Hindia Belanda',
                    'disease_target' => 'Cacar (Smallpox)',
                    'description' => 'Program vaksinasi cacar diperluas ke luar Jawa, menjadi salah satu program imunisasi massal pertama di Hindia Belanda.',
                ],
                'sections' => [
                    'Latar Belakang Perluasan Vaksinasi Cacar',
                    'Pelaksanaan Vaksinasi di Luar Jawa',
                    'Hasil dan Tantangan Program Vaksinasi Cacar',
                ],
            ],
            1918 => [
                'vaccine' => [
                    'name' => 'Vaksin Flu Spanyol (Bacterial)',
                    'manufacturer' => 'Berbagai laboratorium kolonial Hindia Belanda',
                    'disease_target' => 'Influenza (Flu Spanyol)',
                    'description' => 'Upaya vaksin bakterial awal yang dikembangkan di tengah wabah, meski efektivitasnya terbatas karena penyebab flu saat itu belum diketahui berasal dari virus.',
                ],
                'sections' => [
                    'Flu Spanyol di Hindia Belanda',
                    'Dampak Flu Spanyol pada Layanan Kesehatan Kolonial',
                    'Pelajaran dari Wabah Flu Spanyol',
                ],
            ],
            1924 => [
                'vaccine' => [
                    'name' => 'Program Imunisasi Dinas Kesehatan Rakyat',
                    'manufacturer' => 'Dinas Kesehatan Rakyat Hindia Belanda',
                    'disease_target' => 'Berbagai penyakit menular dasar',
                    'description' => 'Dinas Kesehatan Rakyat mulai mengoordinasikan program imunisasi dasar bagi penduduk pribumi di berbagai daerah.',
                ],
                'sections' => [
                    'Pembentukan Dinas Kesehatan Rakyat',
                    'Perluasan Layanan Kesehatan Dasar ke Daerah',
                    'Tantangan Birokrasi Kesehatan Kolonial',
                ],
            ],
            1927 => [
                'vaccine' => [
                    'name' => 'Vaksin Tifus (Riset STOVIA)',
                    'manufacturer' => 'STOVIA, Batavia',
                    'disease_target' => 'Tifus',
                    'description' => 'Sekolah kedokteran STOVIA turut berkontribusi dalam riset dan edukasi seputar vaksin tifus bagi calon dokter pribumi.',
                ],
                'sections' => [
                    'Berdirinya Sekolah Kedokteran STOVIA',
                    'STOVIA sebagai Pusat Pendidikan Dokter Pribumi',
                    'STOVIA dan Lahirnya Kesadaran Pergerakan Nasional',
                ],
            ],
            1930 => [
                'vaccine' => [
                    'name' => 'Program Kina & Pengendalian Malaria',
                    'manufacturer' => 'Perkebunan & Dinas Kesehatan Kolonial',
                    'disease_target' => 'Malaria',
                    'description' => 'Kampanye pemberantasan malaria memanfaatkan kina dan program pengendalian nyamuk di wilayah perkebunan.',
                ],
                'sections' => [
                    'Ancaman Malaria di Wilayah Perkebunan',
                    'Strategi Pemberantasan Malaria Kolonial',
                    'Dampak Program Malaria bagi Pekerja Perkebunan',
                ],
            ],
            1935 => [
                'vaccine' => [
                    'name' => 'Layanan Imunisasi RS CBZ Batavia',
                    'manufacturer' => 'Centrale Burgerlijke Ziekeninrichting (CBZ)',
                    'disease_target' => 'Berbagai penyakit menular',
                    'description' => 'RS CBZ Batavia menjadi rumah sakit rujukan utama sekaligus pusat layanan imunisasi bagi penduduk kota.',
                ],
                'sections' => [
                    'Pembangunan Rumah Sakit CBZ Batavia',
                    'CBZ sebagai Rumah Sakit Rujukan Utama',
                    'Dari CBZ ke RSCM: Warisan yang Berlanjut',
                ],
            ],
            1942 => [
                'vaccine' => [
                    'name' => 'Obat & Vaksin Darurat Masa Pendudukan',
                    'manufacturer' => 'Fasilitas Kesehatan Terbatas Masa Pendudukan Jepang',
                    'disease_target' => 'Berbagai penyakit menular (kondisi darurat)',
                    'description' => 'Di tengah kelangkaan obat dan tenaga medis pada masa pendudukan Jepang, layanan kesehatan darurat tetap diupayakan meski sangat terbatas.',
                ],
                'sections' => [
                    'Kondisi Kesehatan Masa Pendudukan Jepang',
                    'Kelangkaan Obat dan Tenaga Medis',
                    'Dampak Jangka Panjang bagi Sistem Kesehatan',
                ],
            ],
        ];

        foreach ($data as $yearNumber => $info) {
            $year = Year::where('era_id', $era->id)->where('year', $yearNumber)->first();

            if (!$year) {
                $this->command?->warn("Year {$yearNumber} tidak ditemukan di era kolonial, lewati.");
                continue;
            }

            // ---- Sections + Content Blocks ----
            foreach ($info['sections'] as $index => $title) {
                $section = Section::updateOrCreate(
                    ['year_id' => $year->id, 'title' => $title],
                    [
                        'order' => $index + 1,
                        'is_published' => true,
                    ]
                );

                $section->contentBlocks()->delete();
                $section->contentBlocks()->createMany([
                    [
                        'type' => 'text',
                        'content' => "Ini adalah paragraf dummy untuk section \"{$title}\" pada tahun {$yearNumber}. Konten ini menjelaskan latar belakang, peristiwa, dan dampak yang relevan dengan topik section, disusun sebagai teks contoh untuk keperluan pengujian tampilan aplikasi.",
                        'order' => 1,
                    ],
                    [
                        'type' => 'image',
                        'content' => "https://drive.google.com/file/d/CONTOH_FILE_ID_{$yearNumber}_" . ($index + 1) . "/view",
                        'order' => 2,
                    ],
                    [
                        'type' => 'video',
                        'content' => 'https://www.youtube.com/watch?v=CONTOH_VIDEO_ID',
                        'order' => 3,
                    ],
                ]);
            }

            // ---- Vaccine ----
            $vaccine = Vaccine::updateOrCreate(
                ['name' => $info['vaccine']['name']],
                [
                    'photo' => "https://drive.google.com/file/d/CONTOH_FILE_ID_VAKSIN_{$yearNumber}/view",
                    'photo_locked' => "https://drive.google.com/file/d/CONTOH_FILE_ID_VAKSIN_{$yearNumber}_SILUET/view",
                    'manufacturer' => $info['vaccine']['manufacturer'],
                    'disease_target' => $info['vaccine']['disease_target'],
                    'year_introduced' => $yearNumber,
                    'description' => $info['vaccine']['description'],
                ]
            );

            $year->vaccines()->syncWithoutDetaching([$vaccine->id]);
        }

        $this->command?->info('KolonialDummySeeder selesai: 10 tahun x 3 section x content blocks + 1 vaksin/tahun.');
    }
}