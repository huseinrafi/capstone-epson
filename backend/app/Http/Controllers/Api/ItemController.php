<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
    //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255'
        ]);

        $barcode = 'EPSON-' . strtoupper(uniqid());

        $item = Item::create([
            'barcode' => $barcode,
            'name' => $validated['name'],
            'status' => 'active'
        ]);

        return response()->json([
            'success' => true,
            'data' => $item
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
    //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
    //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
    //
    }
    public function showByBarcode($barcode)
    {
        $item = Item::where('barcode', $barcode)->first();

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Barcode tidak ditemukan'
            ], 404);
        }

        // Update status scan
        $item->update([
            'status' => 'scanned',
            'scanned_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'data' => $item
        ]);
    }

}