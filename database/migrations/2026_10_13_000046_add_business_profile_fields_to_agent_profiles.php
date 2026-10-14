<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The business profile (public /business-profile/{slug}): Instagram joins the other social links, and "About me" grows
// from one line to a paragraph.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_profiles', function (Blueprint $table) {
            $table->string('instagram')->nullable()->after('twitter');
            $table->text('about')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('agent_profiles', function (Blueprint $table) {
            $table->dropColumn('instagram');
            $table->string('about')->nullable()->change();
        });
    }
};
