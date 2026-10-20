<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CashRoute HQ Admin Portal — page routes
|--------------------------------------------------------------------------
| One route per Figma frame. Each returns a Blade view in
| resources/views/pages that extends layouts/app.blade.php, where React
| renders the screen. Moving between pages inside the app happens without
| a full reload, but every URL below also works when typed directly,
| bookmarked or refreshed.
|
| No backend yet: data comes from the browser-side mock API
| (resources/js/services/mockApi.ts). Sign in with admin.maker / password.
*/

Route::get('/', fn () => redirect()->route('live.index'))->name('home');

// AP-01 · Login / Account Locked (Session Timeout appears on any page when idle)
Route::view('/login', 'pages.auth.login')->name('login');

// AP-08 · Live Monitoring
Route::view('/live', 'pages.live.index')->name('live.index');
Route::view('/live/stale-gps', 'pages.live.stale-gps')->name('live.stale-gps');

// AP-04/05 · Cash requests (Maker): list, create, summary, edit (own pending requests)
Route::view('/requests', 'pages.requests.index')->name('requests.index');
Route::view('/requests/new', 'pages.requests.create')->name('requests.create');
Route::view('/requests/{id}', 'pages.requests.show')->name('requests.show');
Route::view('/requests/{id}/edit', 'pages.requests.edit')->name('requests.edit');

// AP-06 · Approvals  ·  AP-07 · Reject modal / Team assignment drawer
Route::view('/approvals', 'pages.approvals.index')->name('approvals.index');
Route::view('/approvals/{id}', 'pages.approvals.show')->name('approvals.show');
Route::view('/approvals/{id}/reject', 'pages.approvals.reject')->name('approvals.reject');
Route::view('/approvals/{id}/assign', 'pages.approvals.assign')->name('approvals.assign');

// AP-02 · Branches
Route::view('/branches', 'pages.branches.index')->name('branches.index');
Route::view('/branches/create', 'pages.branches.create')->name('branches.create');
Route::view('/branches/{id}/edit', 'pages.branches.edit')->name('branches.edit');

// AP-03 · Users & Teams
Route::view('/users', 'pages.users.index')->name('users.index');
Route::view('/users/create', 'pages.users.create')->name('users.create');
Route::view('/users/{id}/edit', 'pages.users.edit')->name('users.edit');
Route::view('/teams', 'pages.teams.index')->name('teams.index');

// AP-09 · Audit Trail
Route::view('/audit', 'pages.audit.index')->name('audit.index');

// AP-10 · Reports & Analytics
Route::view('/reports', 'pages.reports.index')->name('reports.index');
Route::view('/reports/{id}', 'pages.reports.show')->name('reports.show');
