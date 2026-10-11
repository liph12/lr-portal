<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Branch offices (legacy offices). Each sits in an area (App\Support\Areas) and has an assigned secretary, who validates
// sales and sees the statistics of that area (OfficeService, TeamLeadershipService::reportScope).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offices', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('province', 100)->nullable();
            $table->string('address', 300)->nullable();
            $table->string('area', 30)->nullable()->index();
            $table->string('email')->nullable();
            $table->string('mobile', 30)->nullable();
            $table->string('telephone', 30)->nullable();
            $table->foreignId('secretary_agent_id')->nullable()->constrained('agents')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offices');
    }
};
