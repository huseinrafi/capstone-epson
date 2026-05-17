<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInboundScanRequest;
use App\Models\Anomaly;
use App\Models\DeliveryOrder;
use App\Models\DoItemBox;
use App\Models\ScanResult;
use App\Services\AnomalyNotificationService;
use App\Services\InboundReconciliationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InboundScanController extends Controller
{
    use ApiResponse;

    public function start(DeliveryOrder $deliveryOrder): JsonResponse
    {
        if (!$deliveryOrder->isPending()) {
            return $this->badRequestResponse('Manifest tidak dalam status PENDING');
        }

        $deliveryOrder->update([
            'status' => DeliveryOrder::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);

        return $this->successResponse(
            $deliveryOrder->fresh(['vendor', 'warehouse', 'items.boxes']),
            'Proses scan inbound dimulai.'
        );
    }

    public function scan(
        StoreInboundScanRequest $request,
        DeliveryOrder $deliveryOrder,
        InboundReconciliationService $service
    ): JsonResponse {
        $allowedStatuses = [
            DeliveryOrder::STATUS_IN_PROGRESS,
            DeliveryOrder::STATUS_HOLD_INBOUND,
        ];

        if (!in_array($deliveryOrder->status, $allowedStatuses)) {
            return $this->badRequestResponse('Manifest tidak sedang dalam proses scan.');
        }

        $result = $service->reconcile(
            $deliveryOrder,
            $request->validated(),
            $request->user('api')
        );

        return $this->successResponse(
            array_merge($result['data'], [
                'manifest_status' => $result['data']['manifest_status'] ?? DeliveryOrder::STATUS_IN_PROGRESS,
            ]),
            $result['message']
        );

    }

    public function finish(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        $allowedStatuses = [
            DeliveryOrder::STATUS_IN_PROGRESS,
            DeliveryOrder::STATUS_HOLD_INBOUND,
        ];

        if (!in_array($deliveryOrder->status, $allowedStatuses)) {
            return $this->badRequestResponse('Manifest tidak sedang dalam proses scan.');
        }

        return DB::transaction(function () use ($deliveryOrder, $request) {
            $missingBoxes = DoItemBox::query()
                ->where('delivery_order_id', $deliveryOrder->id)
                ->where('status', DoItemBox::STATUS_PENDING)
                ->lockForUpdate()
                ->get();

            foreach ($missingBoxes as $box) {
                $box->update(['status' => DoItemBox::STATUS_MISSING]);
            }

            $missingItems = $deliveryOrder->items()
                ->whereColumn('scanned_qty', '<', 'expected_qty')
                ->lockForUpdate()
                ->get();

            foreach ($missingItems as $item) {
                $item->update(['final_status' => 'MISSING']);

                $anomaly = $this->createInboundAnomaly(
                    $deliveryOrder,
                    Anomaly::DISCREPANCY_MISSING,
                    $item->sku,
                    $item->expected_qty,
                    $item->scanned_qty,
                    $request->user('api')->id
                );

                app(AnomalyNotificationService::class)->notifySupervisorsForNewAnomaly($anomaly);
            }

            $status = $missingItems->isEmpty()
                ? DeliveryOrder::STATUS_COMPLETED
                : DeliveryOrder::STATUS_HOLD_INBOUND;

            $deliveryOrder->update([
                'status' => $status,
                'completed_at' => now(),
            ]);

            return $this->successResponse(
                [
                    'manifest' => $deliveryOrder->fresh(['items.boxes']),
                    'missing_item_count' => $missingItems->count(),
                    'missing_box_count' => $missingBoxes->count(),
                ],
                $missingItems->isEmpty()
                ? 'Scan inbound selesai normal.'
                : 'Scan inbound selesai dengan item MISSING. Manifest masuk HOLD_INBOUND.'
            );
        });
    }

    private function createInboundAnomaly(
        DeliveryOrder $deliveryOrder,
        string $discrepancyType,
        string $affectedSku,
        int $expectedQty,
        int $actualQty,
        string $reportedBy
    ): Anomaly {
        return Anomaly::create([
            'anomaly_type' => Anomaly::TYPE_INBOUND_DISCREPANCY,
            'reference_type' => DeliveryOrder::class,
            'reference_id' => $deliveryOrder->id,
            'discrepancy_type' => $discrepancyType,
            'affected_sku' => $affectedSku,
            'expected_qty' => $expectedQty,
            'actual_qty' => $actualQty,
            'status' => Anomaly::STATUS_PENDING_REVIEW,
            'reported_by' => $reportedBy,
        ]);
    }

    public function scanResults(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        $results = ScanResult::query()
            ->with(['operator:id,name', 'doItem:id,sku,part_name,vendor_barcode'])
            ->where('delivery_order_id', $deliveryOrder->id)
            ->when($request->status, fn($q, $s) => $q->where('result_status', $s))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('scanned_barcode', 'ilike', "%{$search}%")
                          ->orWhereHas('operator', fn($u) => $u->where('name', 'ilike', "%{$search}%"));
                });
            })
            ->orderBy('scanned_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        // Tambahkan MISSING dari boxes yang tidak di-scan
        $missingBoxes = \App\Models\DoItemBox::query()
            ->with(['doItem:id,sku,part_name,vendor_barcode'])
            ->where('delivery_order_id', $deliveryOrder->id)
            ->where('status', \App\Models\DoItemBox::STATUS_MISSING)
            ->get()
            ->map(fn($box) => [
                'id' => 'missing_' . $box->id,
                'scanned_barcode' => $box->barcode,
                'result_status' => 'MISSING',
                'scanned_at' => null,
                'operator' => null,
                'device_id' => null,
                'doItem' => $box->doItem,
            ]);

        return $this->successResponse([
            'scan_results' => $results,
            'missing_items' => $missingBoxes,
            'summary' => [
                'total_scanned' => $deliveryOrder->scanned_total,
                'total_expected' => $deliveryOrder->expected_total,
                'do_number' => $deliveryOrder->do_number,
                'status' => $deliveryOrder->status,
            ]
        ], 'Scan results berhasil diambil.');
    }

}