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
            $table->id();
            $table->foreignId('delivery_order_id')->nullable()->constrained('delivery_orders');
            $table->string('vendor_barcode');
            $table->enum('status', ['MATCH', 'MISMATCH', 'OVER', 'NOT_FOUND']);
            $table->foreignId('operator_id')->constrained('users');
            $table->foreignId('node_id')->constrained('nodes');
            $table->timestamps();
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
