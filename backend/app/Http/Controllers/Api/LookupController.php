<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Anomaly;
use App\Models\DoItem;
use App\Models\Role;
use App\Models\Vendor;
use App\Models\Warehouse;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LookupController extends Controller
{
    use ApiResponse;

    public function vendors(Request $request): JsonResponse
    {
        $filters = $this->filters($request);

        $vendors = Vendor::query()
            ->select(['id', 'code', 'name'])
            ->when($filters['q'], function ($query, string $keyword) {
                $query->where(function ($search) use ($keyword) {
                    $search
                        ->where('code', 'like', "%{$keyword}%")
                        ->orWhere('name', 'like', "%{$keyword}%");
                });
            })
            ->orderBy('name')
            ->limit($filters['limit'])
            ->get();

        return $this->successResponse($vendors, 'Lookup vendor berhasil diambil.');
    }

    public function warehouses(Request $request): JsonResponse
    {
        $filters = $this->filters($request);

        $warehouses = Warehouse::query()
            ->select(['id', 'code', 'name', 'location'])
            ->when($filters['q'], function ($query, string $keyword) {
                $query->where(function ($search) use ($keyword) {
                    $search
                        ->where('code', 'like', "%{$keyword}%")
                        ->orWhere('name', 'like', "%{$keyword}%")
                        ->orWhere('location', 'like', "%{$keyword}%");
                });
            })
            ->orderBy('name')
            ->limit($filters['limit'])
            ->get();

        return $this->successResponse($warehouses, 'Lookup warehouse berhasil diambil.');
    }

    public function skus(Request $request): JsonResponse
    {
        $filters = $this->filters($request);

        $skus = DoItem::query()
            ->select('sku')
            ->distinct()
            ->when($filters['q'], fn($query, string $keyword) => $query->where('sku', 'like', "%{$keyword}%"))
            ->orderBy('sku')
            ->limit($filters['limit'])
            ->get()
            ->map(fn(DoItem $item) => [
                'sku' => $item->sku,
                'label' => $item->sku,
            ])
            ->values();

        return $this->successResponse($skus, 'Lookup SKU berhasil diambil.');
    }

    public function anomalyOptions(): JsonResponse
    {
        return $this->successResponse([
            'anomaly_types' => [
                Anomaly::TYPE_INBOUND_DISCREPANCY,
                Anomaly::TYPE_TRANSIT_DISCREPANCY,
            ],
            'discrepancy_types' => [
                Anomaly::DISCREPANCY_MISSING,
                Anomaly::DISCREPANCY_OVER,
                Anomaly::DISCREPANCY_UNEXPECTED,
                Anomaly::DISCREPANCY_MISMATCH,
            ],
            'anomaly_statuses' => [
                Anomaly::STATUS_PENDING_REVIEW,
                Anomaly::STATUS_APPROVED,
                Anomaly::STATUS_HOLD,
                Anomaly::STATUS_RETURNED,
                Anomaly::STATUS_RECOUNT,
            ],
            'review_decisions' => [
                'APPROVE',
                'HOLD',
                'RETURN',
                'RECOUNT',
            ],
        ], 'Lookup opsi anomali berhasil diambil.');
    }

    public function roles(): JsonResponse
    {
        $roles = Role::query()
            ->select(['id', 'name', 'slug', 'description'])
            ->orderBy('name')
            ->get();

        return $this->successResponse($roles, 'Lookup role berhasil diambil.');
    }

    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return [
            'q' => $validated['q'] ?? null,
            'limit' => (int) ($validated['limit'] ?? 50),
        ];
    }
}
