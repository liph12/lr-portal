<?php

use App\Support\Areas;

uses(Tests\TestCase::class);

test('state or city maps to the agent area', function (?string $state, ?string $city, ?string $country, ?string $area) {
    expect(Areas::forAgent($state, $city, $country))->toBe($area);
})->with([
    'grouped place' => ['Negros Occidental', null, 'PH', 'bacolod'],
    'own name, any case' => ['CEBU', null, 'PH', 'cebu'],
    'spelling with spaces' => ['Lapu - lapu City', null, null, 'cebu'],
    'contains area name' => ['Davao Del Sur', null, 'PH', 'davao'],
    'own area beats a group listing it' => ['Pampanga', null, 'PH', 'pampanga'],
    'contains a listed place' => ['Eastern Samar', null, 'PH', 'leyte'],
    'falls back to city' => ['', 'Cagayan de Oro City', 'PH', 'cagayan'],
    'abroad by country' => ['Dubai', 'Dubai', 'AE', 'abroad'],
    'not in the list' => ['Compostela Valley', null, 'PH', null],
    'nothing known' => [null, null, null, null],
]);
