<?php

// use Illuminate\Database\Migrations\Migration;
// use Illuminate\Database\Schema\Blueprint;
// use Illuminate\Support\Facades\Schema;

// return new class extends Migration
// {
//     /**
//      * Run the migrations.
//      */
//     public function up(): void
//     {
//         Schema::table('developers', function (Blueprint $table) {
//             $table->string('profile_name')->nullable()->after('address');
//             $table->dropColumn('url');
//         });
//     }

//     /**
//      * Reverse the migrations.
//      */
//     public function down(): void
//     {
//         Schema::table('developers', function (Blueprint $table) {
//             $table->dropColumn('profile_name');
//             $table->string('url')->nullable()->after('address');
//         });
//     }
// };
