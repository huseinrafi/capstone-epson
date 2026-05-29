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
            $table->uuid('id')->primary();
            $table->enum('anomaly_type', ['INBOUND_DISCREPANCY', 'TRANSIT_DISCREPANCY']);
            $table->uuidMorphs('reference'); 
            $table->enum('discrepancy_type', ['MISSING', 'OVER', 'DAMAGE', 'UNEXPECTED', 'MISMATCH']);
            $table->string('affected_sku', 50);
            $table->integer('expected_qty');
            $table->integer('actual_qty');
            $table->enum('status', ['PENDING_REVIEW', 'APPROVED', 'HOLD', 'RETURNED', 'RECOUNT']);
            $table->foreignUuid('reported_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
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
