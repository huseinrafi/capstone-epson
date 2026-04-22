<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        for ($i = 1; $i <= 10; $i++) {
            \App\Models\Item::create([
                'barcode' => 'EPSON-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'name' => 'Product Item ' . $i,
                'status' => 'active'
            ]);
        }
    }
}