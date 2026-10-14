<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Who approved or disapproved a face-to-face NAO attendance, when, and why (a disapproval's reason, shown to the agent);
// the status index serves the approvals page and its menu badge on every request.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->foreignId('nao_attendance_reviewed_by')->nullable()->after('nao_attendance_submitted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('nao_attendance_reviewed_at')->nullable()->after('nao_attendance_reviewed_by');
            $table->text('nao_attendance_remarks')->nullable()->after('nao_attendance_reviewed_at');
            $table->index(['nao_attendance_status', 'nao_attendance_submitted_at'], 'agent_attributes_nao_review_index');
        });
    }

    public function down(): void
    {
        Schema::table('agent_attributes', function (Blueprint $table) {
            $table->dropIndex('agent_attributes_nao_review_index');
            $table->dropConstrainedForeignId('nao_attendance_reviewed_by');
            $table->dropColumn(['nao_attendance_reviewed_at', 'nao_attendance_remarks']);
        });
    }
};
