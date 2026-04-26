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
        Schema::create('internal_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('internal_barcode', 30)->unique();
            $table->foreignUuid('do_item_id')->constrained('do_items')->restrictOnDelete();
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders')->restrictOnDelete();
            $table->foreignUuid('current_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('received_by')->constrained('users')->restrictOnDelete();
            $table->string('sku', 50);
            $table->string('part_name', 150);
            $table->enum('status', ['AVAILABLE', 'IN_TRANSIT', 'USED', 'DISPOSED']);
            $table->timestamp('received_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('internal_items');
    }
};
