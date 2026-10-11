<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Settings › Preferences: one `preferences` column (links, theme, text size) instead of link settings alone, and a
// permission for the page that every existing role gets, so everyone has it until a role's box is unticked.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('preferences')->nullable()->after('last_active_at');
        });

        DB::table('users')->whereNotNull('link_preferences')->orderBy('id')->each(function ($user) {
            DB::table('users')->where('id', $user->id)->update(['preferences' => json_encode(['links' => json_decode($user->link_preferences, true)])]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('link_preferences');
        });

        if (! DB::table('permissions')->where('name', 'use_preferences')->exists()) {
            $id = DB::table('permissions')->insertGetId(['name' => 'use_preferences', 'label' => 'Settings: Preferences', 'created_at' => now(), 'updated_at' => now()]);
            DB::table('permission_role')->insert(DB::table('roles')->pluck('id')->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
        }
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'use_preferences')->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();

        Schema::table('users', function (Blueprint $table) {
            $table->json('link_preferences')->nullable()->after('last_active_at');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('preferences');
        });
    }
};
