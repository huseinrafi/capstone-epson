<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InternalItem;
use App\Models\Transit;
use App\Models\TransitItem;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $items = InternalItem::query()
            ->with(['currentWarehouse', 'deliveryOrder'])
            ->when($request->status, fn($q, $status) => $q->where('status', $status))
            ->when($request->warehouse_id, fn($q, $whId) => $q->where('current_warehouse_id', $whId))
            ->when($request->status === InternalItem::STATUS_AVAILABLE, function ($q) {
                $q->whereDoesntHave('transitItems', function ($transitItemQuery) {
                    $transitItemQuery
                        ->whereIn('transit_status', [
                            TransitItem::STATUS_PENDING,
                            TransitItem::STATUS_SCANNED_OUT,
                            TransitItem::STATUS_MISSING,
                        ])
                        ->whereHas('transit', function ($transitQuery) {
                            $transitQuery->whereIn('status', [
                                Transit::STATUS_TRANSIT_INIT,
                                Transit::STATUS_IN_TRANSIT,
                                Transit::STATUS_INVESTIGATION_REQUIRED,
                            ]);
                        });
                });
            })
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
