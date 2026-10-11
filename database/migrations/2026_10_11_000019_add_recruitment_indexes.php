<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Recruit reports filter agents by sign-up date and group recruits by their sponsor (agent_attributes.referral_id).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', fn (Blueprint $t) => $t->index('created_at'));
        Schema::table('agent_attributes', fn (Blueprint $t) => $t->index('referral_id'));
    }

    public function down(): void
    {
        Schema::table('agent_attributes', fn (Blueprint $t) => $t->dropIndex(['referral_id']));
        Schema::table('agents', fn (Blueprint $t) => $t->dropIndex(['created_at']));
    }
};
