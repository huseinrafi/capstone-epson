<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 150);
            $table->string('contact_name', 100)->nullable();
            $table->string('contact_phone', 20)->nullable();
            $table->text('address');
            $table->timestamps();
            $table->softDeletes();
        });

        DB::table('vendors')->insert([
            'id' => '46e43185-800e-4b5c-9654-b1629177efa9',
            'code' => 'VND-TEST',
            'name' => 'Vendor Test',
            'contact_name' => 'Test Contact',
            'contact_phone' => '080000000000',
            'address' => 'Test Address',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendors');
    }
};
