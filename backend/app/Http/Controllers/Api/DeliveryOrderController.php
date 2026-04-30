<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeliveryOrderRequest;
use App\Http\Requests\UpdateDeliveryOrderRequest;
use App\Models\DeliveryOrder;
use App\Traits\ApiResponse;
use DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeliveryOrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $orders = DeliveryOrder::query()
            ->with(['vendor', 'warehouse', 'adminUser.role'])
            ->when($request->status, fn($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($orders, 'Data Manifest berhasil diambil.');
    }

    public function queue(Request $request): JsonResponse
    {
        $orders = DeliveryOrder::query()
            ->with(['vendor', 'warehouse'])
            ->where('status', DeliveryOrder::STATUS_PENDING)
            ->oldest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($orders, 'Antrian manifest berhasil diambil.');
    }

    public function store(StoreDeliveryOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $order = DB::transaction(function () use ($validated, $request) {
            $expectedTotal = collect($validated['items'])->sum('expected_qty');

            $order = DeliveryOrder::create([
                'do_number' => $validated['do_number'],
                'vendor_id' => $validated['vendor_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'admin_user_id' => $request->user('api')->id,
                'status' => DeliveryOrder::STATUS_PENDING,
                'expected_total' => $expectedTotal,
                'scanned_total' => 0,
                'notes' => $validated['notes'] ?? null,
            ]);

            $order->items()->createMany($validated['items']);

            return $order->load(['vendor', 'warehouse', 'items']);
        });

        return $this->successResponse($order, 'Manifest berhasil ditambahkan.', 201);
    }

    public function show(DeliveryOrder $deliveryOrder): JsonResponse
    {
        return $this->successResponse(
            $deliveryOrder->load(['vendor', 'warehouse', 'adminUser.role', 'items']),
            'Detail manifest berhasil diambil.'
        );
    }

    public function update(UpdateDeliveryOrderRequest $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        if (!$deliveryOrder->isPending()) {
            return $this->forbiddenResponse('Manifest tidak dapat diedit setelah proses scan dimulai.');
        }

        $validated = $request->validated();

        $order = DB::transaction(function () use ($deliveryOrder, $validated) {
            $expectedTotal = collect($validated['items'])->sum('expected_qty');

            $deliveryOrder->update([
                'do_number' => $validated['do_number'],
                'vendor_id' => $validated['vendor_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'expected_total' => $expectedTotal,
                'notes' => $validated['notes'] ?? null,
            ]);

            $deliveryOrder->items()->delete();
            $deliveryOrder->items()->createMany($validated['items']);

            return $deliveryOrder->load(['vendor', 'warehouse', 'items']);
        });

        return $this->successResponse($order, 'Manifest berhasil diperbarui.');
    }

    public function destroy(DeliveryOrder $deliveryOrder): JsonResponse
    {
        if (!$deliveryOrder->isPending()) {
            return $this->forbiddenResponse('Manifest tidak dapat dibatalkan setelah proses scan dimulai.');
        }

        $deliveryOrder->delete();

        return $this->successResponse(null, 'Manifest DO berhasil dibatalkan.');
    }
}
