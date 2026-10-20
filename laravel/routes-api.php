<?php

// Starting point for routes/api.php once you build the backend.
// These are exactly the endpoints resources/js/services/httpApi.ts calls.
// Controllers are not included yet — create them with `php artisan make:controller`.

use Illuminate\Support\Facades\Route;

Route::post('/login', [\App\Http\Controllers\Api\AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);
    Route::post('/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);

    Route::apiResource('branches', \App\Http\Controllers\Api\BranchController::class)->only(['index', 'store', 'update']);
    Route::apiResource('users', \App\Http\Controllers\Api\UserController::class)->only(['index', 'store', 'update']);
    Route::apiResource('teams', \App\Http\Controllers\Api\TeamController::class)->only(['index', 'store', 'update']);

    Route::get('/requests', [\App\Http\Controllers\Api\CashRequestController::class, 'index']);
    Route::post('/requests', [\App\Http\Controllers\Api\CashRequestController::class, 'store']);
    Route::get('/requests/{id}', [\App\Http\Controllers\Api\CashRequestController::class, 'show']);
    Route::post('/requests/{id}/approve', [\App\Http\Controllers\Api\CashRequestController::class, 'approve']);
    Route::post('/requests/{id}/reject', [\App\Http\Controllers\Api\CashRequestController::class, 'reject']);
    Route::post('/requests/{id}/assign', [\App\Http\Controllers\Api\CashRequestController::class, 'assign']);

    Route::get('/audit-logs', [\App\Http\Controllers\Api\AuditLogController::class, 'index']);
    Route::get('/trips', [\App\Http\Controllers\Api\TripController::class, 'index']);
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'readAll']);
});
