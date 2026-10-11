<?php

use App\Support\Countries;

uses(Tests\TestCase::class);

test('free-typed countries resolve to the canonical name and ISO code', function (?string $raw, ?string $name, ?string $code) {
    expect(Countries::resolve($raw))->toBe(['name' => $name, 'code' => $code]);
})->with([
    ['Philippines', 'Philippines', 'PH'],
    ['phillipines', 'Philippines', 'PH'],
    ['Phils.', 'Philippines', 'PH'],
    ['Manila, Philippines', 'Philippines', 'PH'],
    ['Cebu', 'Philippines', 'PH'],
    ['United States of America', 'United States', 'US'],
    ['HongKong', 'Hong Kong', 'HK'],
    ['Dubai UAE', 'United Arab Emirates', 'AE'],
    ['Philadelphia', 'Philadelphia', null],
    ['N/A', null, null],
    ['', null, null],
    [null, null, null],
]);
