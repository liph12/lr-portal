<?php

// Cached report / statistics results (App\Support\DataCache). Every write bumps the data version, so a cached result is never
// served after the data changed; the TTL only covers changes made outside the app (e.g. straight in the database).
return [
    'enabled' => env('DATA_CACHE_ENABLED', env('APP_ENV') !== 'testing'),

    'ttl_minutes' => (int) env('DATA_CACHE_TTL', 10),

    // Writes that don't change report data: no version bump.
    'ignore_paths' => [
        'broadcasting/*',
        'login*',
        'logout',
        'settings/preferences*',
        'view-as',
        'impersonate*',
        'dashboard/record-sale/*/slip-preview',
        'welcome/nao/progress',
    ],

    // Artisan commands that change data (imports, activity refresh, migrations) bump the version when they finish.
    'commands' => ['legacy:*', 'agents:*', 'rentals:*', 'migrate*', 'db:seed', 'db:wipe'],
];
