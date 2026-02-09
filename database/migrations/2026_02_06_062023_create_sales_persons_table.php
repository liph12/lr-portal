<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('state')->nullable();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            $table->boolean('gender')->default(1);
            $table->string('avatar')->nullable();
            $table->string('marital_status')->nullable();
            $table->double('latitude')->nullable();
            $table->double('longitude')->nullable();
            $table->timestamps();
        });

        Schema::create('agent_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('tax_identification_no')->nullable();
            $table->string('prc_expiration')->nullable();
            $table->string('dhsud_expiration')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('agent_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('referral_link')->nullable();
            $table->integer('referral_id')->nullable();
            $table->string('status')->default('active');
            $table->dateTime('date_activated')->nullable();
            $table->integer('nao_video_tracker')->default(0);
            $table->string('nao_proof_of_attendance')->nullable();
            $table->date('nao_date_of_attendance')->nullable();
            $table->string('nao_attendance_status')->nullable();
            $table->integer('fire_certificates')->default(0);
            $table->integer('sms_credits')->default(0);
            $table->timestamps();
        });

        Schema::create('agent_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained()->onDelete('cascade');
            $table->string('about')->nullable();
            $table->string('work_experience')->nullable();
            $table->string('skills')->nullable();
            $table->string('facebook')->nullable();
            $table->string('linkedin')->nullable();
            $table->string('whatsapp')->nullable();
            $table->string('twitter')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_persons');
    }
};
