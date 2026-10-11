<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The day the agent joined Leuterio Realty (legacy members.lr_joined) — often earlier than their portal sign-up
// (created_at). It's their registration date in the search results and the join date the global-partner rule uses.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->date('lr_joined_at')->nullable()->after('activated_at')->index();
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex(['lr_joined_at']);
            $table->dropColumn('lr_joined_at');
        });
    }
};
