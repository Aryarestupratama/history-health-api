<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // nanti diisi: kelola era, tahun, section, tokoh
});

Route::middleware(['auth:sanctum', 'verified'])->group(function () {
    // route progress, kuis-access, collectible card nanti di sini
});