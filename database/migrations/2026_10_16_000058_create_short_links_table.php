<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Dashboard › QR Code Maker: short links on the portal's own domain (/url/{code}), made by agents for the links they put in
// QR codes; each visit is counted.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('short_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // A generated code, or the alias the agent chose.
            $table->string('code', 40)->unique();
            $table->string('url', 2048);
            $table->string('title', 120)->nullable();
            $table->unsignedInteger('clicks')->default(0);
            $table->timestamp('last_clicked_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('short_links');
    }
};
