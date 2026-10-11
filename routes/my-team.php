<?php

use App\Http\Controllers\Portal\MyTeamController;
use Illuminate\Support\Facades\Route;

// For whoever leads a team or sub-team (any role); the controller and requests check which one.
Route::prefix('my-team')->name('my-team.')->controller(MyTeamController::class)->group(function () {
    Route::get('/', 'index')->name('index');
    Route::get('/members', 'members')->name('members');
    Route::get('/sub-teams', 'subTeams')->name('sub-teams');
    Route::get('/recruits', 'recruits')->name('recruits');

    Route::post('/teams/{team}/members', 'addMember')->name('members.add');
    Route::patch('/teams/{team}/members/{agent}', 'moveMember')->name('members.move');
    Route::post('/teams/{team}/sub-teams', 'storeSubTeam')->name('sub-teams.store');
    Route::put('/teams/{team}/sub-teams/{subTeam}', 'updateSubTeam')->name('sub-teams.update');
});
