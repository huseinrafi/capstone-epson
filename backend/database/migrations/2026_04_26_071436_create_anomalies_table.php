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
        Schema::create('anomalies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scan_result_id')->constrained('scan_results')->cascadeOnDelete();
            $table->string('status')->default('PENDING_REVIEW'); // PENDING_REVIEW, APPROVED, HOLD, RETURN, RECOUNT
            $table->string('evidence_path')->nullable();
            $table->string('gps_location')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('anomalies');
    }
};
