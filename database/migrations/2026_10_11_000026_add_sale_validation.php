<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Sales validation (superadmin, admin, staff portals): who last set a sale's status and when, an index for the
// per-category status counts, and the sales_validation permission for staff.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_transactions', function (Blueprint $table) {
            $table->foreignId('validated_by')->nullable()->after('sale_status')->constrained('users')->nullOnDelete();
            $table->timestamp('validated_at')->nullable()->after('validated_by');
            $table->index(['sale_type', 'sale_status']);
        });

        $permission = DB::table('permissions')->where('name', 'sales_validation')->value('id')
            ?? DB::table('permissions')->insertGetId(['name' => 'sales_validation', 'label' => 'Sales Validation', 'created_at' => now(), 'updated_at' => now()]);
        foreach (DB::table('roles')->whereIn('name', ['superadmin', 'staff'])->pluck('id') as $role) {
            DB::table('permission_role')->insertOrIgnore(['role_id' => $role, 'permission_id' => $permission]);
        }
    }

    public function down(): void
    {
        Schema::table('agent_transactions', function (Blueprint $table) {
            $table->dropIndex(['sale_type', 'sale_status']);
            $table->dropConstrainedForeignId('validated_by');
            $table->dropColumn('validated_at');
        });
    }
};
