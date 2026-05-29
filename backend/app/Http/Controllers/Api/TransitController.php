<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransitRequest;
use App\Http\Requests\TransitScanRequest;
use App\Models\Anomaly;
use App\Models\InternalItem;
use App\Models\Transit;
use App\Models\TransitItem;
use App\Services\AnomalyNotificationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransitController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $transits = Transit::query()
            ->with(['originWarehouse', 'destinationWarehouse', 'creator.role'])
            ->when($request->status, fn($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($transits, 'Data surat jalan transit berhasil diambil.');
    }

    public function store(StoreTransitRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $transit = DB::transaction(function () use ($validated, $request) {
            $items = InternalItem::query()
                ->whereIn('id', $validated['internal_item_ids'])
                ->lockForUpdate()
                ->get();

            if ($items->count() !== count($validated['internal_item_ids'])) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Ada barang internal yang tidak ditemukan.',
                    'errors' => [
                        'internal_item_ids' => $validated['internal_item_ids'],
                    ],
                ], 422));
            }

            $invalidItems = $items->filter(
                fn($item) => $item->current_warehouse_id !== $validated['origin_warehouse_id']
                || $item->status !== InternalItem::STATUS_AVAILABLE
            );

            if ($invalidItems->isNotEmpty()) {
                abort(response()->json([
                    'success' => false,
                    'message' => 'Ada barang yang tidak tersedia di gudang asal.',
                    'errors' => [
                        'internal_item_ids' => $invalidItems->pluck('id')->values(),
                    ],
                ], 422));
            }

            $transit = Transit::create([
                'transit_number' => $validated['transit_number'],
                'origin_warehouse_id' => $validated['origin_warehouse_id'],
                'dest_warehouse_id' => $validated['dest_warehouse_id'],
                'created_by' => $request->user('api')->id,
                'status' => Transit::STATUS_TRANSIT_INIT,
                'expected_total' => $items->count(),
                'sent_total' => 0,
                'received_total' => 0,
            ]);

            foreach ($items as $item) {
                TransitItem::create([
                    'transit_id' => $transit->id,
                    'internal_item_id' => $item->id,
                    'transit_status' => TransitItem::STATUS_PENDING,
                ]);
            }

            return $transit->load([
                'originWarehouse',
                'destinationWarehouse',
                'creator.role',
                'items.internalItem',
            ]);
        });

        return $this->successResponse($transit, 'Surat jalan transit berhasil dibuat.', 201);
    }

    public function show(Transit $transit): JsonResponse
    {
        return $this->successResponse(
            $transit->load([
                'originWarehouse',
                'destinationWarehouse',
                'creator.role',
                'items.internalItem',
                'items.scanOutOperator.role',
                'items.scanInOperator.role',
                'anomalies.reporter.role',
            ]),
            'Detail surat jalan transit berhasil diambil.'
        );
    }

    public function scanOut(TransitScanRequest $request, Transit $transit): JsonResponse
    {
        if ($transit->status !== Transit::STATUS_TRANSIT_INIT) {
            return $this->badRequestResponse('Surat jalan transit tidak dalam status TRANSIT_INIT.');
        }

        return DB::transaction(function () use ($request, $transit) {
            $item = $this->findTransitItemByBarcode($transit, $request->validated('barcode'));

            if (!$item) {
                return $this->badRequestResponse('Barcode tidak terdaftar dalam surat jalan transit aktif.');
            }

            if ($item->transit_status === TransitItem::STATUS_SCANNED_OUT) {
                return $this->badRequestResponse('Barang sudah discan keluar.');
            }

            if ($item->internalItem->current_warehouse_id !== $transit->origin_warehouse_id) {
                return $this->badRequestResponse('Barang tidak berada di gudang asal.');
            }

            $item->update([
                'transit_status' => TransitItem::STATUS_SCANNED_OUT,
                'scan_out_by' => $request->user('api')->id,
                'scanned_out_at' => now(),
            ]);

            $transit->increment('sent_total');

            return $this->successResponse(
                $item->fresh(['internalItem', 'scanOutOperator.role']),
                'Scan keluar berhasil.'
            );
        });
    }

    public function depart(Request $request, Transit $transit): JsonResponse
    {
        if ($transit->status !== Transit::STATUS_TRANSIT_INIT) {
            return $this->badRequestResponse('Surat jalan transit tidak dalam status TRANSIT_INIT.');
        }

        return DB::transaction(function () use ($transit) {
            $pendingItem = $transit->items()
                ->where('transit_status', TransitItem::STATUS_PENDING)
                ->lockForUpdate()
                ->first();

            if ($pendingItem) {
                return $this->badRequestResponse('Masih ada barang yang belum discan keluar.');
            }

            $transit->items()->with('internalItem')->get()->each(function ($item) {
                $item->internalItem->update(['status' => InternalItem::STATUS_IN_TRANSIT]);
            });

            $transit->update([
                'status' => Transit::STATUS_IN_TRANSIT,
                'departed_at' => now(),
            ]);

            return $this->successResponse(
                $transit->fresh(['items.internalItem']),
                'Barang resmi dalam perjalanan.'
            );
        });
    }

    public function scanIn(TransitScanRequest $request, Transit $transit): JsonResponse
    {
        if (!in_array($transit->status, [Transit::STATUS_IN_TRANSIT, Transit::STATUS_INVESTIGATION_REQUIRED], true)) {
            return $this->badRequestResponse('Surat jalan transit tidak dalam status IN_TRANSIT.');
        }

        return DB::transaction(function () use ($request, $transit) {
            $item = $this->findTransitItemByBarcode($transit, $request->validated('barcode'));

            if (!$item) {
                $transit->update(['status' => Transit::STATUS_INVESTIGATION_REQUIRED]);
                $anomaly = $this->createTransitAnomaly(
                    $transit,
                    Anomaly::DISCREPANCY_OVER,
                    substr($request->validated('barcode'), 0, 50),
                    $transit->expected_total,
                    $transit->received_total + 1,
                    $request
                );

                return $this->badRequestResponse(
                    'Barcode tidak terdaftar dalam surat jalan transit. Status menjadi INVESTIGATION_REQUIRED.',
                    [
                        'requires_evidence' => true,
                        'anomaly_id' => $anomaly->id,
                        'evidence_upload_url' => "/api/v1/anomalies/{$anomaly->id}/evidences",
                    ]
                );
            }

            if ($item->transit_status === TransitItem::STATUS_SCANNED_IN) {
                $transit->update(['status' => Transit::STATUS_INVESTIGATION_REQUIRED]);
                $anomaly = $this->createTransitAnomaly(
                    $transit,
                    Anomaly::DISCREPANCY_OVER,
                    $item->internalItem->sku,
                    $transit->expected_total,
                    $transit->received_total + 1,
                    $request
                );

                return $this->badRequestResponse(
                    'Barang sudah discan masuk. Status menjadi INVESTIGATION_REQUIRED.',
                    [
                        'requires_evidence' => true,
                        'anomaly_id' => $anomaly->id,
                        'evidence_upload_url' => "/api/v1/anomalies/{$anomaly->id}/evidences",
                    ]
                );
            }

            if ($item->transit_status !== TransitItem::STATUS_SCANNED_OUT) {
                return $this->badRequestResponse('Barang belum discan keluar dari gudang asal.');
            }

            $item->update([
                'transit_status' => TransitItem::STATUS_SCANNED_IN,
                'scan_in_by' => $request->user('api')->id,
                'scanned_in_at' => now(),
            ]);

            $item->internalItem->update([
                'current_warehouse_id' => $transit->dest_warehouse_id,
                'status' => InternalItem::STATUS_AVAILABLE,
            ]);

            $transit->increment('received_total');

            return $this->successResponse(
                $item->fresh(['internalItem', 'scanInOperator.role']),
                'Scan masuk berhasil.'
            );
        });
    }

    public function complete(Request $request, Transit $transit): JsonResponse
    {
        if (!in_array($transit->status, [Transit::STATUS_IN_TRANSIT, Transit::STATUS_INVESTIGATION_REQUIRED], true)) {
            return $this->badRequestResponse('Surat jalan transit belum bisa diselesaikan.');
        }

        return DB::transaction(function () use ($request, $transit) {
            $missingCount = $transit->items()
                ->where('transit_status', TransitItem::STATUS_SCANNED_OUT)
                ->update(['transit_status' => TransitItem::STATUS_MISSING]);

            if ($missingCount > 0 && !$this->hasPendingMissingTransitAnomaly($transit)) {
                $this->createTransitAnomaly(
                    $transit,
                    Anomaly::DISCREPANCY_MISSING,
                    'MULTIPLE',
                    $transit->expected_total,
                    $transit->received_total,
                    $request
                );
            }

            $status = $this->hasPendingTransitAnomaly($transit)
                ? Transit::STATUS_INVESTIGATION_REQUIRED
                : Transit::STATUS_TRANSIT_COMPLETED;

            $transit->update([
                'status' => $status,
                'arrived_at' => now(),
            ]);

            return $this->successResponse(
                $transit->fresh(['items.internalItem']),
                $status === Transit::STATUS_TRANSIT_COMPLETED
                ? 'Transit selesai normal.'
                : 'Transit selesai dengan selisih. Perlu investigasi supervisor.'
            );
        });
    }

    private function findTransitItemByBarcode(Transit $transit, string $barcode): ?TransitItem
    {
        return TransitItem::query()
            ->with('internalItem')
            ->where('transit_id', $transit->id)
            ->whereHas('internalItem', fn($query) => $query->where('internal_barcode', $barcode))
            ->lockForUpdate()
            ->first();
    }

    private function createTransitAnomaly(
        Transit $transit,
        string $discrepancyType,
        string $affectedSku,
        int $expectedQty,
        int $actualQty,
        Request $request
    ): Anomaly {
        $anomaly = Anomaly::create([
            'anomaly_type' => Anomaly::TYPE_TRANSIT_DISCREPANCY,
            'reference_type' => Transit::class,
            'reference_id' => $transit->id,
            'discrepancy_type' => $discrepancyType,
            'affected_sku' => $affectedSku,
            'expected_qty' => $expectedQty,
            'actual_qty' => $actualQty,
            'status' => Anomaly::STATUS_PENDING_REVIEW,
            'reported_by' => $request->user('api')->id,
        ]);

        app(AnomalyNotificationService::class)->notifySupervisorsForNewAnomaly($anomaly);

        return $anomaly;
    }

    private function hasPendingMissingTransitAnomaly(Transit $transit): bool
    {
        return Anomaly::query()
            ->where('anomaly_type', Anomaly::TYPE_TRANSIT_DISCREPANCY)
            ->where('reference_type', Transit::class)
            ->where('reference_id', $transit->id)
            ->where('discrepancy_type', Anomaly::DISCREPANCY_MISSING)
            ->where('status', Anomaly::STATUS_PENDING_REVIEW)
            ->exists();
    }

    private function hasPendingTransitAnomaly(Transit $transit): bool
    {
        return Anomaly::query()
            ->where('anomaly_type', Anomaly::TYPE_TRANSIT_DISCREPANCY)
            ->where('reference_type', Transit::class)
            ->where('reference_id', $transit->id)
            ->where('status', Anomaly::STATUS_PENDING_REVIEW)
            ->exists();
    }
}
