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
            $table->id();
            $table->string('internal_barcode')->unique(); // EPS-YYYYMMDD-XXXXX
            $table->string('vendor_barcode');
            $table->foreignId('current_node_id')->constrained('nodes');
            $table->string('status')->default('IN_WAREHOUSE');
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
