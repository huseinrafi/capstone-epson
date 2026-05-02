<?php

namespace App\Services;

use App\Models\Anomaly;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\DoItemBox;
use App\Models\ScanResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class InboundReconciliationService
{
    public function reconcile(DeliveryOrder $deliveryOrder, array $payload, User $operator): array
    {
        return DB::transaction(function () use ($deliveryOrder, $payload, $operator) {
            $barcode = $payload['barcode'];

            $box = DoItemBox::query()
                ->with('doItem')
                ->where('delivery_order_id', $deliveryOrder->id)
                ->where('barcode', $barcode)
                ->lockForUpdate()
                ->first();

            if (!$box) {
                $scan = $this->recordScan($deliveryOrder, null, $operator, $payload, ScanResult::STATUS_NOT_FOUND);

                $this->recordAnomaly(
                    $deliveryOrder,
                    Anomaly::DISCREPANCY_UNEXPECTED,
                    substr($barcode, 0, 50),
                    0,
                    1,
                    $operator
                );

                return $this->result($scan, ScanResult::STATUS_NOT_FOUND, false, 'Barcode tidak ditemukan di manifest aktif.');
            }

            $item = DoItem::query()
                ->whereKey($box->do_item_id)
                ->lockForUpdate()
                ->firstOrFail();

            if (($payload['sku'] ?? null) && $payload['sku'] !== $item->sku) {
                $scan = $this->recordScan($deliveryOrder, $item, $operator, $payload, ScanResult::STATUS_MISMATCH);

                $this->recordAnomaly(
                    $deliveryOrder,
                    Anomaly::DISCREPANCY_MISMATCH,
                    $item->sku,
                    $item->expected_qty,
                    $item->scanned_qty,
                    $operator
                );

                return $this->result($scan, ScanResult::STATUS_MISMATCH, false, 'Jenis part tidak sesuai expected data.');
            }

            if ($box->status === DoItemBox::STATUS_SCANNED) {
                $scan = $this->recordScan($deliveryOrder, $item, $operator, $payload, ScanResult::STATUS_OVER);

                $this->recordAnomaly(
                    $deliveryOrder,
                    Anomaly::DISCREPANCY_OVER,
                    $item->sku,
                    $item->expected_qty,
                    $item->scanned_qty + 1,
                    $operator
                );

                return $this->result($scan, ScanResult::STATUS_OVER, false, 'Jumlah scan sudah melebihi expected quantity.');
            }

            $box->update([
                'status' => DoItemBox::STATUS_SCANNED,
                'scanned_at' => now(),
            ]);

            $item->increment('scanned_qty');
            $item->refresh();

            if ($item->scanned_qty === $item->expected_qty) {
                $item->update(['final_status' => ScanResult::STATUS_MATCH]);
            }

            $deliveryOrder->increment('scanned_total');

            $scan = $this->recordScan($deliveryOrder, $item, $operator, $payload, ScanResult::STATUS_MATCH);

            return $this->result(
                $scan,
                ScanResult::STATUS_MATCH,
                true,
                'Scan MATCH.',
                [
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
                ]
            );
        });
    }

    private function recordScan(
        DeliveryOrder $deliveryOrder,
        ?DoItem $item,
        User $operator,
        array $payload,
        string $status
    ): ScanResult {
        return ScanResult::create([
            'delivery_order_id' => $deliveryOrder->id,
            'do_item_id' => $item?->id,
            'operator_id' => $operator->id,
            'scanned_barcode' => $payload['barcode'],
            'result_status' => $status,
            'scanned_at' => now(),
            'device_id' => $payload['device_id'] ?? null,
        ]);
    }

    private function recordAnomaly(
        DeliveryOrder $deliveryOrder,
        string $type,
        string $affectedSku,
        int $expectedQty,
        int $actualQty,
        User $operator
    ): Anomaly {
        return Anomaly::create([
            'anomaly_type' => Anomaly::TYPE_INBOUND_DISCREPANCY,
            'reference_type' => DeliveryOrder::class,
            'reference_id' => $deliveryOrder->id,
            'discrepancy_type' => $type,
            'affected_sku' => $affectedSku,
            'expected_qty' => $expectedQty,
            'actual_qty' => $actualQty,
            'status' => Anomaly::STATUS_PENDING_REVIEW,
            'reported_by' => $operator->id,
        ]);
    }

    private function result(
        ScanResult $scan,
        string $status,
        bool $printLabel,
        string $message,
        array $extraData = []
    ): array {
        return [
            'message' => $message,
            'data' => array_merge([
                'scan' => $scan,
                'result_status' => $status,
                'print_label' => $printLabel,
            ], $extraData),
        ];
    }
}
