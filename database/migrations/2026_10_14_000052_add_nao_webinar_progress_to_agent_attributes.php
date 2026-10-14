<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The New Agents Webinar: how far in an agent has watched (resumes there; nao_video_tracker keeps the %), when that was last
// saved (caps how far a save may jump), and when an attendance proof was sent for the sponsor to approve.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->unsignedInteger('nao_video_seconds')->default(0)->after('nao_video_tracker');
            $table->timestamp('nao_video_saved_at')->nullable()->after('nao_video_seconds');
            $table->timestamp('nao_attendance_submitted_at')->nullable()->after('nao_attendance_status');
        });
    }

    public function down(): void
    {
        Schema::table('agent_attributes', fn (Blueprint $table) => $table->dropColumn(['nao_video_seconds', 'nao_video_saved_at', 'nao_attendance_submitted_at']));
    }
};
