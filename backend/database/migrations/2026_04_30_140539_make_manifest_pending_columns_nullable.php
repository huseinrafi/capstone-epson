<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->change();
            $table->timestamp('completed_at')->nullable()->change();
        });

        Schema::table('do_items', function (Blueprint $table) {
            $table->string('vendor_barcode', 100)->nullable()->change();
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE do_items ALTER COLUMN final_status DROP NOT NULL');
        } else {
            Schema::table('do_items', function (Blueprint $table) {
                $table->enum('final_status', ['MATCH', 'MISMATCH', 'MISSING', 'OVER'])
                    ->nullable()
                    ->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable(false)->change();
            $table->timestamp('completed_at')->nullable(false)->change();
        });

        Schema::table('do_items', function (Blueprint $table) {
            $table->string('vendor_barcode', 100)->nullable(false)->change();
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE do_items ALTER COLUMN final_status SET NOT NULL');
        } else {
            Schema::table('do_items', function (Blueprint $table) {
                $table->enum('final_status', ['MATCH', 'MISMATCH', 'MISSING', 'OVER'])
                    ->nullable(false)
                    ->change();
            });
        }
    }
};
