<?php

use App\Http\Controllers\Portal\ManagementController;
use App\Models\Entities\Team;
use Illuminate\Support\Facades\Route;

// Management lives in both the superadmin and admin portals: each portal file calls this with its
// own name, giving /{portal}/management/... routes named {portal}.management.*.
return function (string $portal) {
    // The cards: agents, teams, sub-teams, transfers and the two commission receivings (each card by its permission).
    Route::get('/management', [ManagementController::class, 'index'])
        ->middleware('can:open,'.Team::class)
        ->name("{$portal}.management.index");

    Route::prefix('management')
        ->name("{$portal}.management.")
        ->middleware('can:manage,'.Team::class)
        ->controller(ManagementController::class)
        ->group(function () {
            Route::get('/teams', 'teams')->name('teams');
            Route::get('/sub-teams', 'subTeams')->name('sub-teams');
            Route::get('/agents', 'agents')->name('agents');
            Route::get('/transfers', 'transfers')->name('transfers');

            Route::post('/teams', 'storeTeam')->name('teams.store');
            Route::put('/teams/{team}', 'updateTeam')->name('teams.update');
            Route::patch('/teams/{team}/status', 'teamStatus')->name('teams.status');
            Route::post('/teams/{team}/photo', 'teamLogo')->name('teams.photo');

            Route::post('/sub-teams', 'storeSubTeam')->name('sub-teams.store');
            Route::put('/sub-teams/{subTeam}', 'updateSubTeam')->name('sub-teams.update');
            Route::patch('/sub-teams/{subTeam}/status', 'subTeamStatus')->name('sub-teams.status');
            Route::post('/sub-teams/{subTeam}/photo', 'subTeamLogo')->name('sub-teams.photo');

            Route::patch('/agents/{agent}/status', 'agentStatus')->name('agents.status');
            Route::patch('/agents/{agent}/type', 'agentType')->name('agents.type');
            Route::put('/agents/{agent}/designation', 'agentDesignation')->name('agents.designation');
            Route::post('/agents/{agent}/photo', 'agentPhoto')->name('agents.photo');
            Route::post('/agents/{agent}/transfer', 'transfer')->name('agents.transfer');
        });
};
