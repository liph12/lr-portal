<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// The "update your business card" announcement (public/assets/posters), so a rebuilt database has it as well as the NATCON one;
// it goes after whatever posters exist, and only once.
return new class extends Migration
{
    private const IMAGE = '/assets/posters/business-card-update.jpg';

    public function up(): void
    {
        if (DB::table('dashboard_posters')->where('image_url', self::IMAGE)->exists()) {
            return;
        }
        DB::table('dashboard_posters')->insert([
            'title' => 'Update your business card information',
            'image_url' => self::IMAGE,
            'link_url' => '/profile/business',
            'is_active' => true,
            'sort_order' => (int) DB::table('dashboard_posters')->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('dashboard_posters')->where('image_url', self::IMAGE)->delete();
    }
};
