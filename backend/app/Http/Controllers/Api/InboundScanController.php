<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInboundScanRequest;
use App\Models\Anomaly;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\DoItemBox;
use App\Models\ScanResult;
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

    public function scan(StoreInboundScanRequest $request, DeliveryOrder $deliveryOrder): JsonResponse
    {
        if ($deliveryOrder->status !== DeliveryOrder::STATUS_IN_PROGRESS) {
            return $this->badRequestResponse('Manifest tidak sedang dalam proses scan.');
        }

        $payload = $request->validated();
        $barcode = $payload['barcode'];

        return DB::transaction(function () use ($deliveryOrder, $request, $payload, $barcode) {
            $box = DoItemBox::query()
                ->where('delivery_order_id', $deliveryOrder->id)
                ->where('barcode', $barcode)
                ->lockForUpdate()
                ->first();

            if (!$box) {
                $scan = ScanResult::create([
                    'delivery_order_id' => $deliveryOrder->id,
                    'do_item_id' => null,
                    'operator_id' => $request->user('api')->id,
                    'scanned_barcode' => $barcode,
                    'result_status' => ScanResult::STATUS_NOT_FOUND,
                    'scanned_at' => now(),
                    'device_id' => $payload['device_id'] ?? null,
                ]);

                $this->createInboundAnomaly(
                    $deliveryOrder,
                    'UNEXPECTED',
                    substr($barcode, 0, 50),
                    0,
                    1,
                    $request->user('api')->id
                );

                $deliveryOrder->update(['status' => DeliveryOrder::STATUS_HOLD_INBOUND]);

                return $this->successResponse([
                    'scan' => $scan,
                    'result_status' => ScanResult::STATUS_NOT_FOUND,
                    'print_label' => false,
                    'manifest_status' => DeliveryOrder::STATUS_HOLD_INBOUND,
                ], 'Barcode tidak sesuai manifest. Manifest masuk HOLD_INBOUND.');
            }

            $item = DoItem::query()
                ->whereKey($box->do_item_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($box->status === DoItemBox::STATUS_SCANNED) {
                return $this->errorResponse(
                    'Barcode box ini sudah pernah di-scan.',
                    409,
                    [
                        'barcode' => $box->barcode,
                        'sku' => $item->sku,
                        'scanned_at' => $box->scanned_at,
                    ]
                );
            }

            $box->update([
                'status' => DoItemBox::STATUS_SCANNED,
                'scanned_at' => now(),
            ]);

            $item->increment('scanned_qty');
            $item->refresh();

            if ($item->scanned_qty === $item->expected_qty) {
                $item->update(['final_status' => 'MATCH']);
            }

            $deliveryOrder->increment('scanned_total');

            $scan = ScanResult::create([
                'delivery_order_id' => $deliveryOrder->id,
                'do_item_id' => $item->id,
                'operator_id' => $request->user('api')->id,
                'scanned_barcode' => $barcode,
                'result_status' => ScanResult::STATUS_MATCH,
                'scanned_at' => now(),
                'device_id' => $payload['device_id'] ?? null,
            ]);

            return $this->successResponse([
                'scan' => $scan,
                'result_status' => ScanResult::STATUS_MATCH,
                'print_label' => true,
                'label_payload' => [
                    'delivery_order_id' => $deliveryOrder->id,
                    'do_number' => $deliveryOrder->do_number,
                    'sku' => $item->sku,
                    'part_name' => $item->part_name,
                    'vendor_barcode' => $item->vendor_barcode,
                    'box_barcode' => $box->barcode,
                ],
                'item_progress' => [
                    'expected_qty' => $item->expected_qty,
                    'scanned_qty' => $item->scanned_qty,
                ],
                'manifest_status' => DeliveryOrder::STATUS_IN_PROGRESS,
            ], 'Scan MATCH. Silakan cetak label internal.');
        });
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
                    'MISSING',
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
