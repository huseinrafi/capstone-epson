<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInboundScanRequest;
use App\Models\Anomaly;
use App\Models\DeliveryOrder;
use App\Models\DoItemBox;
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
        if ($deliveryOrder->status !== DeliveryOrder::STATUS_IN_PROGRESS) {
            return $this->badRequestResponse('Manifest tidak sedang dalam proses scan.');
        }

        $result = $service->reconcile(
            $deliveryOrder,
            $request->validated(),
            $request->user('api')
        );

        return $this->successResponse(
            array_merge($result['data'], [
                'manifest_status' => DeliveryOrder::STATUS_IN_PROGRESS,
            ]),
            $result['message']
        );

    }

    public function finish(Request $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        if ($deliveryOrder->status !== DeliveryOrder::STATUS_IN_PROGRESS) {
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

                $this->createInboundAnomaly(
                    $deliveryOrder,
                    Anomaly::DISCREPANCY_MISSING,
                    $item->sku,
                    $item->expected_qty,
                    $item->scanned_qty,
                    $request->user('api')->id
                );
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

}
