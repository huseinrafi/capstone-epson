<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('do_item_boxes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('delivery_order_id')->constrained('delivery_orders')->cascadeOnDelete();
            $table->foreignUuid('do_item_id')->constrained('do_items')->cascadeOnDelete();
            $table->string('barcode', 100);
            $table->enum('status', ['PENDING', 'SCANNED', 'MISSING'])->default('PENDING');
            $table->timestamp('scanned_at')->nullable();
            $table->timestamps();

            $table->unique(['delivery_order_id', 'barcode']);
        });

        DB::table('do_items')
            ->whereNotNull('vendor_barcode')
            ->orderBy('id')
            ->get()
            ->each(function (object $item): void {
                for ($index = 0; $index < $item->expected_qty; $index++) {
                    DB::table('do_item_boxes')->insertOrIgnore([
                        'id' => (string) Str::uuid(),
                        'delivery_order_id' => $item->delivery_order_id,
                        'do_item_id' => $item->id,
                        'barcode' => $item->vendor_barcode . '-' . $this->barcodeSuffix($index),
                        'status' => 'PENDING',
                        'scanned_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('do_item_boxes');
    }

    private function barcodeSuffix(int $index): string
    {
        $suffix = '';
        $index++;

        while ($index > 0) {
            $index--;
            $suffix = chr(65 + ($index % 26)) . $suffix;
            $index = intdiv($index, 26);
        }

        return $suffix;
    }
};
