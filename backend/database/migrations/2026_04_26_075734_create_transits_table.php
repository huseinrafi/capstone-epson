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
        Schema::create('transits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('transit_number', 30)->unique();
            $table->foreignUuid('origin_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('dest_warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['TRANSIT_INIT', 'IN_TRANSIT', 'TRANSIT_COMPLETED', 'INVESTIGATION_REQUIRED']);
            $table->unsignedInteger('expected_total')->default(0);
            $table->unsignedInteger('sent_total')->default(0);
            $table->unsignedInteger('received_total')->default(0);
            $table->timestamp('departed_at')->nullable();
            $table->timestamp('arrived_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transits');
    }
};
