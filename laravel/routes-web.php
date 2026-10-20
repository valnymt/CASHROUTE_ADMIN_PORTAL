<?php

// Paste into routes/web.php of your Laravel project.
// Every non-API URL returns the React shell; React Router renders the page.

use Illuminate\Support\Facades\Route;

Route::view('/{any?}', 'app')
    ->where('any', '^(?!api|sanctum|storage|build).*$')
    ->name('spa');
