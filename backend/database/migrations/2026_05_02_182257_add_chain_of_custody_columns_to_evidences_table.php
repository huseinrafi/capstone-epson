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
        Schema::table('evidences', function (Blueprint $table) {
            $table->string('file_hash', 64)->nullable()->after('file_url');
            $table->string('mime_type', 100)->nullable()->after('file_hash');
            $table->unsignedBigInteger('file_size_bytes')->nullable()->after('mime_type');
            $table->string('device_id', 50)->nullable()->after('longitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evidences', function (Blueprint $table) {
            $table->dropColumn([
                'file_hash',
                'mime_type',
                'file_size_bytes',
                'device_id',
            ]);
        });
    }
};
