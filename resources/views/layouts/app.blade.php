<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" type="image/png" href="{{ asset('assets/logo.png') }}">
    <title>@yield('title') · {{ config('app.name', 'CashRoute') }} HQ Admin</title>

    @viteReactRefresh
    @vite('resources/js/app.tsx')
</head>
<body>
    {{--
        Shared shell for every portal page. The page's screen (sidebar, tables,
        modals…) is rendered by React into #app; each view in resources/views/pages
        only sets the title and which Figma frame it is.

        data-base   URL prefix for React Router (e.g. /CashRoute_Admin_Portal/public under XAMPP)
        data-asset  Laravel asset() root for images in public/assets
    --}}
    <div id="app"
         data-page="@yield('page')"
         data-base="{{ request()->getBaseUrl() }}"
         data-asset="{{ rtrim(asset(''), '/') }}"></div>

    <noscript>CashRoute HQ Admin needs JavaScript enabled.</noscript>
</body>
</html>
