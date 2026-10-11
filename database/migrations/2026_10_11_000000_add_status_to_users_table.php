<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Everyone who can sign in today stays able to; only "active" may sign in.
            $table->string('status', 20)->default('active')->after('password')->index();
            $table->timestamp('status_changed_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn(['status', 'status_changed_at']);
        });
    }
};
