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
        Schema::create('transit_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transit_id')->constrained('transits')->cascadeOnDelete();
            $table->foreignUuid('internal_item_id')->constrained('internal_items')->restrictOnDelete();
            $table->foreignUuid('scan_out_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('scan_in_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('scanned_out_at')->nullable();
            $table->timestamp('scanned_in_at')->nullable();
            $table->enum('transit_status', ['PENDING', 'SCANNED_OUT', 'SCANNED_IN', 'MISSING', 'OVER'])->default('PENDING');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transit_items');
    }
};
