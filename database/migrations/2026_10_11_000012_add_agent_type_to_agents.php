<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Local agents work in the Philippines; global partners sell from abroad (legacy members.national_intern).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('agent_type', 20)->default('local')->after('user_id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex(['agent_type']);
            $table->dropColumn('agent_type');
        });
    }
};
