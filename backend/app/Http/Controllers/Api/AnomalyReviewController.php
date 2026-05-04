<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewAnomalyRequest;
use App\Models\Anomaly;
use App\Models\AuditLog;
use App\Models\DeliveryOrder;
use App\Models\DoItemBox;
use App\Models\Transit;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnomalyReviewController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $anomalies = Anomaly::query()
            ->with(['reference', 'reporter.role', 'evidences.uploader'])
            ->when($request->anomaly_type, fn($query, $type) => $query->where('anomaly_type', $type))
            ->where('status', Anomaly::STATUS_PENDING_REVIEW)
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($anomalies, 'Antrian review anomali berhasil diambil.');
    }

    public function show(Anomaly $anomaly): JsonResponse
    {
        return $this->successResponse(
            $anomaly->load(['reference', 'reporter.role', 'reviewer.role', 'scanResult', 'evidences.uploader.role']),
            'Detail anomali berhasil diambil.'
        );
    }

    public function review(ReviewAnomalyRequest $request, Anomaly $anomaly): JsonResponse
    {
        if ($anomaly->status !== Anomaly::STATUS_PENDING_REVIEW) {
            return $this->badRequestResponse('Anomali sudah diproses.');
        }

        $validated = $request->validated();

        $reviewed = DB::transaction(function () use ($anomaly, $request, $validated) {
            $lockedAnomaly = Anomaly::query()
                ->whereKey($anomaly->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedAnomaly->status !== Anomaly::STATUS_PENDING_REVIEW) {
                return $lockedAnomaly;
            }

            $deliveryOrder = $lockedAnomaly->reference_type === DeliveryOrder::class
                ? DeliveryOrder::query()->whereKey($lockedAnomaly->reference_id)->lockForUpdate()->first()
                : null;
            $transit = $lockedAnomaly->reference_type === Transit::class
                ? Transit::query()->whereKey($lockedAnomaly->reference_id)->lockForUpdate()->first()
                : null;

            $oldValue = [
                'anomaly_status' => $lockedAnomaly->status,
                'delivery_order_status' => $deliveryOrder?->status,
                'transit_status' => $transit?->status,
            ];

            $decisionStatus = $this->decisionToAnomalyStatus($validated['decision']);
            $deliveryOrderStatus = $this->decisionToDeliveryOrderStatus($validated['decision'], $deliveryOrder);
            $transitStatus = $this->decisionToTransitStatus($validated['decision'], $transit);

            $lockedAnomaly->update([
                'status' => $decisionStatus,
                'reviewed_by' => $request->user('api')->id,
                'review_notes' => $validated['notes'] ?? null,
                'reviewed_at' => now(),
            ]);

            if ($deliveryOrder) {
                if ($validated['decision'] === 'RECOUNT') {
                    $this->resetInboundScanState($deliveryOrder);
                }

                $deliveryOrder->update([
                    'status' => $deliveryOrderStatus,
                    'completed_at' => in_array($deliveryOrderStatus, [
                        DeliveryOrder::STATUS_COMPLETED,
                        DeliveryOrder::STATUS_RETURNED,
                    ], true) ? now() : null,
                ]);
            }

            if ($transit) {
                $transit->update([
                    'status' => $transitStatus,
                    'arrived_at' => $transitStatus === Transit::STATUS_TRANSIT_COMPLETED ? now() : $transit->arrived_at,
                ]);
            }

            AuditLog::create([
                'user_id' => $request->user('api')->id,
                'action' => 'ANOMALY_REVIEWED',
                'reference_type' => Anomaly::class,
                'reference_id' => $lockedAnomaly->id,
                'old_value' => $oldValue,
                'new_value' => [
                    'decision' => $validated['decision'],
                    'anomaly_status' => $decisionStatus,
                    'delivery_order_status' => $deliveryOrderStatus,
                    'transit_status' => $transitStatus,
                ],
                'notes' => $validated['notes'] ?? null,
                'ip_address' => $request->ip(),
            ]);

            return $lockedAnomaly->fresh(['reference', 'reviewer.role', 'evidences']);
        });

        return $this->successResponse($reviewed, 'Keputusan supervisor berhasil disimpan.');
    }

    private function decisionToAnomalyStatus(string $decision): string
    {
        return match ($decision) {
            'APPROVE' => Anomaly::STATUS_APPROVED,
            'HOLD' => Anomaly::STATUS_HOLD,
            'RETURN' => Anomaly::STATUS_RETURNED,
            'RECOUNT' => Anomaly::STATUS_RECOUNT,
        };
    }

    private function decisionToDeliveryOrderStatus(string $decision, ?DeliveryOrder $deliveryOrder): ?string
    {
        if (! $deliveryOrder) {
            return null;
        }

        return match ($decision) {
            'APPROVE' => DeliveryOrder::STATUS_COMPLETED,
            'HOLD' => DeliveryOrder::STATUS_HOLD_INBOUND,
            'RETURN' => DeliveryOrder::STATUS_RETURNED,
            'RECOUNT' => DeliveryOrder::STATUS_IN_PROGRESS,
        };
    }

    private function decisionToTransitStatus(string $decision, ?Transit $transit): ?string
    {
        if (! $transit) {
            return null;
        }

        return match ($decision) {
            'APPROVE' => Transit::STATUS_TRANSIT_COMPLETED,
            'HOLD', 'RETURN' => Transit::STATUS_INVESTIGATION_REQUIRED,
            'RECOUNT' => Transit::STATUS_IN_TRANSIT,
        };
    }

    private function resetInboundScanState(DeliveryOrder $deliveryOrder): void
    {
        $deliveryOrder->items()->update([
            'scanned_qty' => 0,
            'final_status' => null,
        ]);

        $deliveryOrder->boxes()->update([
            'status' => DoItemBox::STATUS_PENDING,
            'scanned_at' => null,
        ]);

        $deliveryOrder->update([
            'scanned_total' => 0,
        ]);
    }
}
