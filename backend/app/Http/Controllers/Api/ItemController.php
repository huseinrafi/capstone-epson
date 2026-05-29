<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InternalItem;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of the resource.
     * Akses terbuka untuk admin_gudang, supervisor, manajer — tanpa filter user_id.
     */
    public function index(Request $request): JsonResponse
    {
        $items = InternalItem::query()
            ->with(['currentWarehouse', 'deliveryOrder'])
            ->when($request->status, fn($q, $status) => $q->where('status', $status))
            ->when($request->warehouse_id, fn($q, $whId) => $q->where('current_warehouse_id', $whId))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($items, 'Data internal items berhasil diambil.');
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