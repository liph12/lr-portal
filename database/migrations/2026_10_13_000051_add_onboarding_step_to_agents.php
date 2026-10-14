<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The last onboarding step a new agent finished (OnboardingService::STEPS): while it isn't the last one, the dashboard
// sends them to /welcome.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('onboarding_step', 20)->nullable()->after('referral_code');
        });
    }

    public function down(): void
    {
        Schema::table('agents', fn (Blueprint $table) => $table->dropColumn('onboarding_step'));
    }
};
