<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// A random code per agent for their referral link (/register?ref={code}): the link can't be guessed by counting agent ids,
// so the registration page doesn't reveal everyone's name and team. Made on first use (Agent::referralCode).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('referral_code', 16)->nullable()->unique()->after('contact_slug');
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['referral_code']);
            $table->dropColumn('referral_code');
        });
    }
};
