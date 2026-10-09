<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->foreignId('project_property_type_id')->nullable()->after('project_name')->constrained()->nullOnDelete();

            // A sale is a financial record; removing a project from the catalogue must not delete it.
            $table->dropForeign(['developer_project_id']);
            $table->foreign('developer_project_id')->references('id')->on('developer_projects')->nullOnDelete();
        });

        DB::table('agent_project_transactions')
            ->whereNotNull('property_type')
            ->orderBy('id')
            ->each(function ($sale) {
                $typeId = DB::table('project_property_types')->where('name', $sale->property_type)->value('id');

                DB::table('agent_project_transactions')->where('id', $sale->id)->update(['project_property_type_id' => $typeId]);
            });

        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->dropColumn('property_type');
        });
    }

    public function down(): void
    {
        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->string('property_type')->nullable()->after('project_name');
        });

        DB::table('agent_project_transactions')
            ->whereNotNull('project_property_type_id')
            ->orderBy('id')
            ->each(function ($sale) {
                $name = DB::table('project_property_types')->where('id', $sale->project_property_type_id)->value('name');

                DB::table('agent_project_transactions')->where('id', $sale->id)->update(['property_type' => $name]);
            });

        Schema::table('agent_project_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_property_type_id');
            $table->dropForeign(['developer_project_id']);
            $table->foreign('developer_project_id')->references('id')->on('developer_projects')->cascadeOnDelete();
        });
    }
};
