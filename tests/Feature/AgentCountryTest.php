<?php

use App\Models\Entities\Agent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an agent with no country is in the Philippines; a recorded country is kept', function () {
    $user = User::factory()->create();
    $agent = Agent::create(['user_id' => $user->id, 'email' => $user->email, 'state' => 'Cebu']);

    expect($agent->fresh()->only(['country', 'country_code', 'area']))->toBe(['country' => 'Philippines', 'country_code' => 'PH', 'area' => 'cebu']);

    $abroad = User::factory()->create();
    $other = Agent::forceCreate(['user_id' => $abroad->id, 'email' => $abroad->email, 'country' => 'Japan', 'country_code' => 'JP']);
    expect($other->fresh()->only(['country_code', 'area']))->toBe(['country_code' => 'JP', 'area' => 'abroad']);
});
