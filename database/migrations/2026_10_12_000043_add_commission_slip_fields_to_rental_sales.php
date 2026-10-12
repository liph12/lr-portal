<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Rental sales are now encoded from the Rent.ph Rent Commission Report Slip: the amount received (8.3% of the contract,
// which gives the total), the rate and duration of the rental, the size, the contract and a proof of transaction. The
// Rent.ph share (20%) and the team / unit manager aren't stored — they're worked out, the latter from the closing agent
// (hence closing_agent_id). Receiving is signed, as for brokerage.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->unsignedSmallInteger('duration_value')->nullable()->after('rental_rate');
            $table->string('duration_unit', 10)->nullable()->after('duration_value');
            $table->decimal('commission_rate', 5, 2)->nullable()->after('commission_received');
            $table->unsignedBigInteger('closing_agent_id')->nullable()->after('closing_agent')->index();
            $table->unsignedBigInteger('partner_agent_id')->nullable()->after('partner_agent');
            $table->string('contract')->nullable()->after('remittance_slip');
            $table->string('proof_of_transaction')->nullable()->after('contract');
            $table->unsignedBigInteger('received_by')->nullable()->after('proof_of_transaction');
            $table->timestamp('received_at')->nullable()->after('received_by');
            $table->string('received_signature')->nullable()->after('received_at');
        });

        if (! DB::table('permissions')->where('name', 'receive_rental_sales')->exists()) {
            $id = DB::table('permissions')->insertGetId(['name' => 'receive_rental_sales', 'label' => 'Receive rental sales', 'created_at' => now(), 'updated_at' => now()]);
            $roles = DB::table('roles')->whereIn('name', ['superadmin', 'admin', 'staff', 'secretary'])->pluck('id');
            DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
        }
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'receive_rental_sales')->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();

        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->dropIndex(['closing_agent_id']);
            $table->dropColumn(['duration_value', 'duration_unit', 'commission_rate', 'closing_agent_id', 'partner_agent_id', 'contract', 'proof_of_transaction', 'received_by', 'received_at', 'received_signature']);
        });
    }
};
