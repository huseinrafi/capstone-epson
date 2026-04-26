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
        Schema::create('scan_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders')->cascadeOnDelete();
            $table->foreignUuid('do_item_id')->nullable()->constrained('do_items')->nullOnDelete();
            $table->foreignUuid('operator_id')->constrained('users')->restrictOnDelete();
            $table->string('scanned_barcode', 100);
            $table->enum('result_status', ['MATCH', 'MISMATCH', 'OVER', 'NOT_FOUND']);
            $table->timestamp('scanned_at')->useCurrent();
            $table->string('device_id', 50)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scan_results');
    }
};
