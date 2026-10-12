<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Brokerage sales are now encoded from the Brokerage Commission Report Slip: the commission received (5% of the
// property, which gives the total), the company's share (15% or 10%), the contract, a proof of transaction and the
// agents involved. The slip itself is generated (remittance_slip). "Received" is a separate step that validates the sale.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_brokerage_transactions', function (Blueprint $table) {
            $table->decimal('commission_rate', 5, 2)->nullable()->after('commission_received');
            $table->decimal('company_share_rate', 5, 2)->nullable()->after('commission_rate');
            $table->decimal('company_share', 14, 2)->nullable()->after('company_share_rate');
            $table->string('contract')->nullable()->after('remittance_slip');
            $table->string('proof_of_transaction')->nullable()->after('contract');
            $table->string('closing_agent')->nullable()->after('proof_of_transaction');
            $table->string('partner_agent')->nullable()->after('closing_agent');
            $table->unsignedBigInteger('signing_broker_id')->nullable()->after('partner_agent')->index();
            $table->unsignedBigInteger('received_by')->nullable()->after('signing_broker_id');
            $table->timestamp('received_at')->nullable()->after('received_by');
        });

        if (! DB::table('permissions')->where('name', 'receive_brokerage_sales')->exists()) {
            $id = DB::table('permissions')->insertGetId(['name' => 'receive_brokerage_sales', 'label' => 'Receive brokerage sales', 'created_at' => now(), 'updated_at' => now()]);
            $roles = DB::table('roles')->whereIn('name', ['superadmin', 'admin', 'staff', 'secretary'])->pluck('id');
            DB::table('permission_role')->insert($roles->map(fn ($role) => ['role_id' => $role, 'permission_id' => $id])->all());
        }
    }

    public function down(): void
    {
        $id = DB::table('permissions')->where('name', 'receive_brokerage_sales')->value('id');
        DB::table('permission_role')->where('permission_id', $id)->delete();
        DB::table('permissions')->where('id', $id)->delete();

        Schema::table('agent_brokerage_transactions', function (Blueprint $table) {
            $table->dropIndex(['signing_broker_id']);
            $table->dropColumn(['commission_rate', 'company_share_rate', 'company_share', 'contract', 'proof_of_transaction', 'closing_agent', 'partner_agent', 'signing_broker_id', 'received_by', 'received_at']);
        });
    }
};
