<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// What the agent registration stepper asks that had nowhere to go: birthdate, citizenship, barangay and postal code on the
// agent; education, professions and hobbies (picked from lists, stored as JSON) on the profile.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->date('birthdate')->nullable()->after('marital_status');
            $table->string('citizenship', 60)->nullable()->after('birthdate');
            $table->string('barangay', 120)->nullable()->after('address');
            $table->string('postal_code', 12)->nullable()->after('barangay');
        });
        Schema::table('agent_profiles', function (Blueprint $table) {
            $table->json('education')->nullable()->after('skills');
            $table->json('professions')->nullable()->after('education');
            $table->json('hobbies')->nullable()->after('professions');
        });
    }

    public function down(): void
    {
        Schema::table('agents', fn (Blueprint $table) => $table->dropColumn(['birthdate', 'citizenship', 'barangay', 'postal_code']));
        Schema::table('agent_profiles', fn (Blueprint $table) => $table->dropColumn(['education', 'professions', 'hobbies']));
    }
};
