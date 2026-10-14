<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Announcements / posters on everyone's dashboard (Settings › Dashboard posters), shown as a carousel. Starts with the NATCON
// 2026 poster that used to be fixed in the page.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_posters', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->string('image_url', 2048);
            // An in-app path ("/natcon") or an https link; optional.
            $table->string('link_url', 2048)->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });

        DB::table('dashboard_posters')->insert([
            'title' => 'National Real Estate Convention 2026',
            'image_url' => '/assets/posters/natcon-2026-banner.jpg',
            'link_url' => '/natcon',
            'is_active' => true,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_posters');
    }
};
