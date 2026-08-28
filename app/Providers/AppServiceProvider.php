<?php

namespace App\Providers;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Paksa Laravel selalu generate URL (termasuk signed URL verifikasi
        // email) berdasarkan APP_URL di .env, BUKAN dari host request yang
        // masuk. Tanpa ini, link verifikasi yang di-generate dari request
        // emulator Android (host: 10.0.2.2) nggak bisa dibuka dari browser
        // PC biasa, karena 10.0.2.2 cuma valid dari DALAM emulator.
        //
        // Dengan fix ini, link verifikasi selalu pakai host dari APP_URL
        // (mis. http://127.0.0.1:8000), yang bisa dibuka baik dari PC
        // maupun emulator (asalkan APP_URL diset ke alamat yang bisa
        // diakses dari tempat kamu buka link-nya).
        if (config('app.url')) {
            URL::forceRootUrl(config('app.url'));
        }
    }
}
