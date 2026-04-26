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
        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('do_number', 50)->unique();
            $table->foreignUuid('vendor_id')->constrained('vendors')->restrictOnDelete();
            $table->foreignUuid('warehouse_id')->constrained('warehouses')->restrictOnDelete();
            $table->foreignUuid('admin_user_id')->constrained('users')->restrictOnDelete();
            $table->enum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'HOLD_INBOUND', 'RETURNED'])->default('PENDING');
            $table->unsignedInteger('expected_total')->default(0);
            $table->unsignedInteger('scanned_total')->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_orders');
    }
};
