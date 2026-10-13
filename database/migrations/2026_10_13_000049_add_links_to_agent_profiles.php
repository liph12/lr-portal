<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "My Links" on the public business profile: the agent's own labelled links (website, listings, booking page…),
// kept as a small JSON list of {label, url}.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_profiles', function (Blueprint $table) {
            $table->json('links')->nullable()->after('instagram');
        });
    }

    public function down(): void
    {
        Schema::table('agent_profiles', function (Blueprint $table) {
            $table->dropColumn('links');
        });
    }
};
