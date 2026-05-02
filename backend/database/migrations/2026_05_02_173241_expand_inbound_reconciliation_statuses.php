<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $this->setDiscrepancyTypes(['MISSING', 'OVER', 'DAMAGE', 'UNEXPECTED', 'MISMATCH']);
    }

    public function down(): void
    {
        $this->setDiscrepancyTypes(['MISSING', 'OVER', 'DAMAGE', 'UNEXPECTED']);
    }

    /**
     * Laravel maps enum columns differently per database driver.
     */
    private function setDiscrepancyTypes(array $types): void
    {
        $driver = DB::getDriverName();
        $quotedTypes = collect($types)
            ->map(fn(string $type): string => "'{$type}'")
            ->implode(', ');

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE anomalies MODIFY discrepancy_type ENUM({$quotedTypes})");

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE anomalies DROP CONSTRAINT IF EXISTS anomalies_discrepancy_type_check');
            DB::statement("ALTER TABLE anomalies ADD CONSTRAINT anomalies_discrepancy_type_check CHECK (discrepancy_type IN ({$quotedTypes}))");

            return;
        }

        if ($driver === 'sqlite') {
            Schema::table('anomalies', function (Blueprint $table) use ($types): void {
                $table->enum('discrepancy_type', $types)->change();
            });
        }
    }
};
