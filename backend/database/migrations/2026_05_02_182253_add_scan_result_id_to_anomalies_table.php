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
        Schema::table('anomalies', function (Blueprint $table) {
            $table->foreignUuid('scan_result_id')
                ->nullable()
                ->after('reference_id')
                ->constrained('scan_results')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('anomalies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('scan_result_id');
        });
    }
};
