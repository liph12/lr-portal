<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- Apply the saved light/dark mode before first paint so dark users never see a white flash. --}}
        <script>
            (function () {
                try {
                    var mode = localStorage.getItem('lr-theme-mode') || 'light';
                    var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.remove('light', 'dark');
                    document.documentElement.classList.add(dark ? 'dark' : 'light');
                } catch (e) {}
            })();
        </script>
        @vite('resources/js/app.tsx')
        @inertiaHead
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0px; overflow: hidden">
        @inertia
    </body>
</html>