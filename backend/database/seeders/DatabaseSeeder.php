<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Generic Roles
        $roles = ['operator_checker', 'admin_gudang', 'supervisor', 'manajer'];
        foreach ($roles as $role) {
            User::firstOrCreate(
                ['role' => $role],
                ['name' => 'Generic ' . ucfirst(str_replace('_', ' ', $role))]
            );
        }

        // 2. Seed Nodes
        $nodes = [
            ['name' => 'Gate 1 Inbound', 'type' => 'INBOUND_GATE'],
            ['name' => 'Gate 2 Inbound', 'type' => 'INBOUND_GATE'],
            ['name' => 'Warehouse Area A', 'type' => 'WAREHOUSE'],
            ['name' => 'Warehouse Area B', 'type' => 'WAREHOUSE'],
            ['name' => 'Transit Hub Jakarta', 'type' => 'TRANSIT'],
        ];

        foreach ($nodes as $node) {
            DB::table('nodes')->updateOrInsert(['name' => $node['name']], $node);
        }

        // 3. Seed Dummy Delivery Order for Phase 2 Testing
        $doId = DB::table('delivery_orders')->insertGetId([
            'do_number' => 'DO-EPSON-001',
            'vendor_name' => 'PT Epson Indonesia',
            'status' => 'PENDING',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('d_o_items')->insert([
            [
                'delivery_order_id' => $doId,
                'vendor_barcode' => '8991234567891',
                'sku' => 'PRINTER-L3110',
                'expected_qty' => 50,
                'scanned_qty' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'delivery_order_id' => $doId,
                'vendor_barcode' => '8999876543211',
                'sku' => 'INK-003-BK',
                'expected_qty' => 100,
                'scanned_qty' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }
}
