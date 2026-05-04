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
        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 50);
            $table->string('slug', 50)->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        DB::table('roles')->insert([
            [
                'id' => '3aa23da2-c97e-4158-8428-e0407bd0b246',
                'name' => 'operator checker',
                'slug' => 'operator_checker',
                'description' => 'Operator yang melakukan pengecekan dan scan barang.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => '1a3c0a92-147a-4e98-a701-ff81bfe2ccdc',
                'name' => 'admin gudang',
                'slug' => 'admin_gudang',
                'description' => 'Admin gudang yang mengelola manifest dan surat transit.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => '634cc604-f293-4dee-9ac6-4e279133249c',
                'name' => 'supervisor',
                'slug' => 'supervisor',
                'description' => 'Supervisor yang meninjau anomali dan approval operasional.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 'ced1a293-2aac-43e7-8a78-2c45878aadb4',
                'name' => 'manajer',
                'slug' => 'manajer',
                'description' => 'Manajer yang memantau dan mengelola proses gudang.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
