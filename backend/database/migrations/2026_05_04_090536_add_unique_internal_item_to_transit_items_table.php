<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transit_items', function (Blueprint $table) {
            $table->unique(['transit_id', 'internal_item_id'], 'transit_items_transit_internal_unique');
            $table->index(['transit_id', 'transit_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transit_items', function (Blueprint $table) {
            $table->dropUnique('transit_items_transit_internal_unique');
            $table->dropIndex(['transit_id', 'transit_status']);
        });
    }
};
