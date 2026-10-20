<?php

use Illuminate\Support\Facades\Route;

/*
| The HQ Admin Portal is a React single-page app. Every page URL
| (/login, /live, /approvals/REQ-1048, ...) returns the same Blade shell
| and React Router decides which screen to show.
|
| Add API routes (routes/api.php, via `php artisan install:api`) for the
| real backend; they are excluded from this catch-all.
*/

Route::view('/{any?}', 'app')
    ->where('any', '^(?!api|sanctum|storage|build|up).*$')
    ->name('spa');
