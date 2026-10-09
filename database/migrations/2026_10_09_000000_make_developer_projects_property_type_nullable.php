<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Legacy projects use 0 (and a few retired ids) for "no type"; they import with a null type instead.
    public function up(): void
    {
        Schema::table('developer_projects', function (Blueprint $table) {
            $table->foreignId('project_property_type_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('developer_projects', function (Blueprint $table) {
            $table->foreignId('project_property_type_id')->nullable(false)->change();
        });
    }
};
