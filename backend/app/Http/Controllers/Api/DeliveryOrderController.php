<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDeliveryOrderRequest;
use App\Http\Requests\UpdateDeliveryOrderRequest;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeliveryOrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $orders = DeliveryOrder::query()
            ->with(['vendor', 'warehouse', 'adminUser.role'])
            ->when($request->status, fn($query, $status) => $query->where('status', $status))
            ->when($request->search, function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('do_number', 'like', "%{$search}%")
                          ->orWhereHas('vendor', fn($v) => $v->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($orders, 'Data Manifest berhasil diambil.');
    }

    public function queue(Request $request): JsonResponse
    {
        $orders = DeliveryOrder::query()
            ->with(['vendor', 'warehouse'])
            ->whereIn('status', [
                DeliveryOrder::STATUS_IN_PROGRESS,
                DeliveryOrder::STATUS_HOLD_INBOUND,
                DeliveryOrder::STATUS_PENDING,
            ])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('do_number', 'like', "%{$search}%")
                          ->orWhereHas('vendor', fn($v) => $v->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByRaw("CASE status WHEN 'IN_PROGRESS' THEN 1 WHEN 'HOLD_INBOUND' THEN 2 WHEN 'PENDING' THEN 3 ELSE 4 END")
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

            foreach ($validated['items'] as $itemData) {
                $this->createItemWithBoxes($order, $itemData);
            }

            return $order->load(['vendor', 'warehouse', 'items.boxes']);
        });

        return $this->successResponse($order, 'Manifest berhasil ditambahkan.', 201);
    }

    public function show(DeliveryOrder $deliveryOrder): JsonResponse
    {
        return $this->successResponse(
            $deliveryOrder->load(['vendor', 'warehouse', 'adminUser.role', 'items.boxes', 'anomalies.evidences']),
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
            foreach ($validated['items'] as $itemData) {
                $this->createItemWithBoxes($deliveryOrder, $itemData);
            }

            return $deliveryOrder->load(['vendor', 'warehouse', 'items.boxes']);
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

    private function createItemWithBoxes(DeliveryOrder $order, array $itemData): DoItem
    {
        $item = $order->items()->create($itemData);

        $boxes = [];

        for ($index = 0; $index < $item->expected_qty; $index++) {
            $boxes[] = [
                'delivery_order_id' => $order->id,
                'barcode' => $item->vendor_barcode . '-' . $this->barcodeSuffix($index),
                'status' => 'PENDING',
            ];
        }

        $item->boxes()->createMany($boxes);

        return $item;
    }

    private function barcodeSuffix(int $index): string
    {
        $suffix = '';
        $index++;

        while ($index > 0) {
            $index--;
            $suffix = chr(65 + ($index % 26)) . $suffix;
            $index = intdiv($index, 26);
        }

        return $suffix;
    }
}