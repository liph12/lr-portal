<?php

// Areas (offices) agents belong to, from the legacy LOCATIONS_LATEST list: an agent's state (or city) is matched
// against an area's own name and, for grouped areas, the places listed under it. See App\Support\Areas.
return [
    'cebu' => ['name' => 'Cebu', 'places' => ['Lapu-lapu', 'Cordova', 'Mactan', 'Lapu-lapu City', 'Lapu- lapu City', 'Lapu - lapu City', 'Cebu']],
    'davao' => ['name' => 'Davao', 'places' => []],
    'bohol' => ['name' => 'Bohol', 'places' => []],
    'gensan' => ['name' => 'Gensan', 'places' => ['General Santos', 'Sultan Kudarat', 'South Cotabato', 'Sarangani', 'Cotabato', 'Cotabato City']],
    'dumaguete' => ['name' => 'Dumaguete', 'places' => ['Dumaguete', 'Negros Oriental', 'Siquijor']],
    'iloilo' => ['name' => 'Iloilo', 'places' => ['Iloilo', 'Aklan', 'Capiz', 'Antique', 'Roxas', 'Kalibo', 'Guimaras']],
    'metro-manila' => ['name' => 'Metro Manila', 'places' => ['Metro Manila', 'Manila', 'Bulacan', 'Cavite', 'Rizal', 'Laguna', 'Camarines Sur', 'Batangas', 'Ilocos Sur', 'Ilocos Norte', 'Camarines Norte', 'Albay', 'Tarlac', 'Pampanga', 'Pangasinan', 'Sorsogon', 'Masbate', 'Ifugao']],
    'bacolod' => ['name' => 'Bacolod', 'places' => ['Bacolod', 'Negros Occidental']],
    'cagayan' => ['name' => 'Cagayan', 'places' => ['Misamis Oriental', 'Bukidnon', 'Lanao del Norte', 'Zamboanga del Sur', 'Zamboanga del Norte', 'Misamis Occidental', 'Lanao del Sur', 'Butuan', 'Agusan Del Sur', 'Agusan del Norte', 'Surigao del Norte', 'Surigao del Sur', 'Dinagat Islands', 'Cagayan Valley']],
    'iligan' => ['name' => 'Iligan', 'places' => []],
    'leyte' => ['name' => 'Leyte', 'places' => ['Leyte', 'Samar', 'Tacloban', 'Southern Leyte', 'Ormoc']],
    'palawan' => ['name' => 'Palawan', 'places' => []],
    'pampanga' => ['name' => 'Pampanga', 'places' => []],
    // Not in the legacy list: agents based outside the Philippines (by agents.country_code).
    'abroad' => ['name' => 'Abroad', 'places' => []],
];
