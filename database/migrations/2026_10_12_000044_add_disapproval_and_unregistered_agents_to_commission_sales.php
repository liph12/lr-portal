<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Brokerage / rental receiving: a slip can be disapproved (with the reason) instead of received. Rentals can be credited to a
// closing agent who has no LR account yet, kept by name, email and mobile until an account with that email or mobile links
// them. Receiving is a back-office job: secretaries lose the receive permissions.
return new class extends Migration
{
    private const TABLES = ['agent_brokerage_transactions', 'agent_rental_transactions'];

    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->unsignedBigInteger('disapproved_by')->nullable()->after('received_signature');
                $table->timestamp('disapproved_at')->nullable()->after('disapproved_by');
                $table->string('disapproval_reason', 500)->nullable()->after('disapproved_at');
            });
        }
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->string('unregistered_agent_email')->nullable()->after('closing_agent_id')->index();
            $table->string('unregistered_agent_mobile', 30)->nullable()->after('unregistered_agent_email')->index();
        });

        $permissions = DB::table('permissions')->whereIn('name', ['receive_brokerage_sales', 'receive_rental_sales'])->pluck('id');
        $secretary = DB::table('roles')->where('name', 'secretary')->value('id');
        DB::table('permission_role')->where('role_id', $secretary)->whereIn('permission_id', $permissions)->delete();
    }

    public function down(): void
    {
        Schema::table('agent_rental_transactions', function (Blueprint $table) {
            $table->dropIndex(['unregistered_agent_email']);
            $table->dropIndex(['unregistered_agent_mobile']);
            $table->dropColumn(['unregistered_agent_email', 'unregistered_agent_mobile']);
        });
        foreach (self::TABLES as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn(['disapproved_by', 'disapproved_at', 'disapproval_reason']));
        }
    }
};
