<?php

namespace App\Services;

use App\Constants\RoleConstant;
use App\Models\Anomaly;
use App\Models\DeliveryOrder;
use App\Models\DoItem;
use App\Models\DoItemBox;
use App\Models\ScanResult;
use App\Models\SupervisorNotification;
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

            if (! $box) {
                $scan = $this->recordScan($deliveryOrder, null, $operator, $payload, ScanResult::STATUS_NOT_FOUND);

                $anomaly = $this->recordAnomaly(
                    $deliveryOrder,
                    $scan,
                    Anomaly::DISCREPANCY_UNEXPECTED,
                    substr($barcode, 0, 50),
                    0,
                    1,
                    $operator
                );

                return $this->anomalyResult($scan, $anomaly, ScanResult::STATUS_NOT_FOUND, 'Barcode tidak ditemukan di manifest aktif.');
            }

            $item = DoItem::query()
                ->whereKey($box->do_item_id)
                ->lockForUpdate()
                ->firstOrFail();

            if (($payload['sku'] ?? null) && $payload['sku'] !== $item->sku) {
                $scan = $this->recordScan($deliveryOrder, $item, $operator, $payload, ScanResult::STATUS_MISMATCH);

                $anomaly = $this->recordAnomaly(
                    $deliveryOrder,
                    $scan,
                    Anomaly::DISCREPANCY_MISMATCH,
                    $item->sku,
                    $item->expected_qty,
                    $item->scanned_qty,
                    $operator
                );

                return $this->anomalyResult($scan, $anomaly, ScanResult::STATUS_MISMATCH, 'Jenis part tidak sesuai expected data.');
            }

            if ($box->status === DoItemBox::STATUS_SCANNED) {
                $scan = $this->recordScan($deliveryOrder, $item, $operator, $payload, ScanResult::STATUS_OVER);

                $anomaly = $this->recordAnomaly(
                    $deliveryOrder,
                    $scan,
                    Anomaly::DISCREPANCY_OVER,
                    $item->sku,
                    $item->expected_qty,
                    $item->scanned_qty + 1,
                    $operator
                );

                return $this->anomalyResult($scan, $anomaly, ScanResult::STATUS_OVER, 'Jumlah scan sudah melebihi expected quantity.');
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
        ScanResult $scan,
        string $type,
        string $affectedSku,
        int $expectedQty,
        int $actualQty,
        User $operator
    ): Anomaly {
        $anomaly = Anomaly::create([
            'anomaly_type' => Anomaly::TYPE_INBOUND_DISCREPANCY,
            'reference_type' => DeliveryOrder::class,
            'reference_id' => $deliveryOrder->id,
            'scan_result_id' => $scan->id,
            'discrepancy_type' => $type,
            'affected_sku' => $affectedSku,
            'expected_qty' => $expectedQty,
            'actual_qty' => $actualQty,
            'status' => Anomaly::STATUS_PENDING_REVIEW,
            'reported_by' => $operator->id,
        ]);

        $deliveryOrder->update([
            'status' => DeliveryOrder::STATUS_HOLD_INBOUND,
        ]);

        $this->notifySupervisors($deliveryOrder, $anomaly, $operator);

        return $anomaly;
    }

    private function notifySupervisors(DeliveryOrder $deliveryOrder, Anomaly $anomaly, User $operator): void
    {
        $supervisors = User::query()
            ->where('is_active', true)
            ->whereHas('role', fn ($query) => $query->where('slug', RoleConstant::SUPERVISOR_SLUG))
            ->get();

        foreach ($supervisors as $supervisor) {
            SupervisorNotification::create([
                'user_id' => $supervisor->id,
                'anomaly_id' => $anomaly->id,
                'title' => 'Anomali inbound perlu review',
                'message' => sprintf(
                    'DO %s memiliki anomali %s pada SKU %s, dilaporkan oleh %s.',
                    $deliveryOrder->do_number,
                    $anomaly->discrepancy_type,
                    $anomaly->affected_sku,
                    $operator->name
                ),
                'review_url' => "/api/v1/anomalies/{$anomaly->id}",
            ]);
        }
    }

    private function anomalyResult(
        ScanResult $scan,
        Anomaly $anomaly,
        string $status,
        string $message
    ): array {
        return $this->result($scan, $status, false, $message, [
            'manifest_status' => DeliveryOrder::STATUS_HOLD_INBOUND,
            'requires_evidence' => true,
            'anomaly' => $anomaly->load(['reporter.role']),
            'evidence_upload_url' => "/api/v1/anomalies/{$anomaly->id}/evidences",
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
