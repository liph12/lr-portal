<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Where the agent is based: canonical name (config/countries.php) and ISO code, so the UI can show a flag.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('country', 100)->nullable()->after('state');
            $table->char('country_code', 2)->nullable()->after('country')->index();
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropIndex(['country_code']);
            $table->dropColumn(['country', 'country_code']);
        });
    }
};
