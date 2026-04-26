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
        Schema::create('do_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders')->cascadeOnDelete();
            $table->string('sku', 50);
            $table->string('part_name', 150);
            $table->string('vendor_barcode', 100);
            $table->unsignedInteger('expected_qty')->default(0);
            $table->unsignedInteger('scanned_qty')->default(0);
            $table->enum('final_status', ['MATCH', 'MISMATCH', 'MISSING', 'OVER']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('do_items');
    }
};
