<?php

namespace Database\Seeders;

use App\Constants\RoleConstant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB; 
use Illuminate\Support\Str;        
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'id'=> (string) Str::uuid(),
            'role_id' => RoleConstant::OPERATOR_CHECKER_ID,
            'name' => 'operator01',
            'email' => 'awikwok@gmail.com',
            'password' => Hash::make('12345678')
        ]);

        User::factory()->create([
            'id'=> (string) Str::uuid(),
            'role_id' => RoleConstant::ADMIN_GUDANG_ID,
            'name' => 'admin01',
            'email' => 'akuadmin@gmail.com',
            'password' => Hash::make('12345678')
        ]);

        User::factory()->create([
            'id'=> (string) Str::uuid(),
            'role_id' => RoleConstant::SUPERVISOR_ID,
            'name' => 'spv01',
            'email' => 'akuspv@gmail.com',
            'password' => Hash::make('12345678')
        ]);

        DB::table('warehouses')->insert([
            [
                'id' => (string) Str::uuid(), 
                'code' => 'WH-TEST',
                'name' => 'Warehouse Test',
                'location' => 'Test Location',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string) Str::uuid(), 
                'code' => 'WH-GDL',
                'name' => 'Warehouse Gondanglegi',
                'location' => 'Gondanglegi, Malang',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);

        DB::table('vendors')->insert([
            'id' => (string) Str::uuid(),
            'code' => 'VND-TEST02',
            'name' => 'Vendor Test02',
            'contact_name' => 'Test Contact 02',
            'contact_phone' => '0800000800000',
            'address' => 'Test Address 02',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}