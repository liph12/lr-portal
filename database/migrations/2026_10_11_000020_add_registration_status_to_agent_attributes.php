<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The registration stepper an agent got through (1–4, legacy members.registration_status). Only step 4 is a fully
// registered agent; member and recruit statistics count those only.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->unsignedTinyInteger('registration_status')->nullable()->after('status')->index();
        });
    }

    public function down(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->dropIndex(['registration_status']);
            $table->dropColumn('registration_status');
        });
    }
};
