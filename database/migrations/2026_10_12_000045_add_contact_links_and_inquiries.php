<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Each agent gets a public contact page at /contact/{slug}; inquiries sent from it are kept for the agent.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->string('contact_slug', 120)->nullable()->unique()->after('avatar');
        });

        Schema::create('contact_inquiries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agent_id')->constrained('agents')->cascadeOnDelete();
            $table->string('inquirer_role', 60);
            $table->string('inquiry_type', 60);
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('email');
            $table->string('contact_number', 30);
            $table->text('message');
            $table->timestamp('consented_at');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_inquiries');

        Schema::table('agents', function (Blueprint $table) {
            $table->dropUnique(['contact_slug']);
            $table->dropColumn('contact_slug');
        });
    }
};
