<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DashboardAnalyticsRequest;
use App\Models\Anomaly;
use App\Models\AuditLog;
use App\Models\DeliveryOrder;
use App\Models\ScanResult;
use App\Models\Transit;
use App\Models\Vendor;
use App\Models\Warehouse;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Illuminate\Support\Collection;

class DashboardAnalyticsController extends Controller
{
    use ApiResponse;

    public function overview(DashboardAnalyticsRequest $request): JsonResponse
    {
        $filters = $this->filters($request);

        return $this->successResponse([
            'summary' => $this->summary($filters),
            'discrepancy_trend' => $this->discrepancyTrend($filters),
            'vendor_breakdown' => $this->vendorBreakdown($filters),
            'anomaly_distribution' => $this->anomalyDistribution($filters),
            'top_problematic_parts' => $this->topProblematicParts($filters),
            'warehouse_performance' => $this->warehousePerformance($filters),
            'recent_audit_logs' => $this->recentAuditLogs($filters),
        ], 'Dashboard analitik berhasil diambil.');
    }

    public function anomalyDrilldown(DashboardAnalyticsRequest $request): JsonResponse
    {
        $filters = $this->filters($request);

        $anomalies = $this->anomalyQuery($filters)
            ->with(['reference', 'reporter.role', 'reviewer.role', 'evidences.uploader.role'])
            ->latest()
            ->paginate($filters['per_page']);

        $auditLogs = AuditLog::query()
            ->with('user.role')
            ->where('action', 'ANOMALY_REVIEWED')
            ->where('reference_type', Anomaly::class)
            ->whereIn('reference_id', collect($anomalies->items())->pluck('id'))
            ->latest()
            ->get()
            ->keyBy('reference_id');

        $anomalies->getCollection()->transform(function (Anomaly $anomaly) use ($auditLogs) {
            $anomaly->setAttribute('review_audit_log', $auditLogs->get($anomaly->id));

            return $anomaly;
        });

        return $this->successResponse($anomalies, 'Drilldown anomali berhasil diambil.');
    }

    public function transactionDrilldown(DashboardAnalyticsRequest $request): JsonResponse
    {
        $filters = $this->filters($request);

        $deliveryOrders = $this->deliveryOrderQuery($filters)
            ->withCount('anomalies')
            ->get()
            ->map(fn (DeliveryOrder $deliveryOrder) => [
                'type' => 'DELIVERY_ORDER',
                'id' => $deliveryOrder->id,
                'number' => $deliveryOrder->do_number,
                'status' => $deliveryOrder->status,
                'total_anomalies' => $deliveryOrder->anomalies_count,
                'created_at' => $deliveryOrder->created_at,
            ]);

        $transits = $this->transitQuery($filters)
            ->withCount('anomalies')
            ->get()
            ->map(fn (Transit $transit) => [
                'type' => 'TRANSIT',
                'id' => $transit->id,
                'number' => $transit->transit_number,
                'status' => $transit->status,
                'total_anomalies' => $transit->anomalies_count,
                'created_at' => $transit->created_at,
            ]);

        $transactions = $deliveryOrders
            ->concat($transits)
            ->sortByDesc('created_at')
            ->values();

        return $this->successResponse(
            $this->paginateCollection($transactions, $filters['per_page'], $request->integer('page', 1), $request->url(), $request->query()),
            'Drilldown transaksi berhasil diambil.'
        );
    }

    private function filters(DashboardAnalyticsRequest $request): array
    {
        $validated = $request->validated();

        return [
            'date_from' => Carbon::parse($validated['date_from'] ?? now()->startOfMonth())->startOfDay(),
            'date_to' => Carbon::parse($validated['date_to'] ?? now())->endOfDay(),
            'vendor_id' => $validated['vendor_id'] ?? null,
            'sku' => $validated['sku'] ?? null,
            'warehouse_id' => $validated['warehouse_id'] ?? null,
            'group_by' => $validated['group_by'] ?? 'day',
            'per_page' => (int) ($validated['per_page'] ?? 15),
        ];
    }

    private function summary(array $filters): array
    {
        $deliveryOrders = $this->deliveryOrderQuery($filters);

        return [
            'total_delivery_orders' => (clone $deliveryOrders)->count(),
            'total_match_scans' => $this->scanResultQuery($filters)
                ->where('result_status', ScanResult::STATUS_MATCH)
                ->count(),
            'total_anomalies' => $this->anomalyQuery($filters)->count(),
            'average_processing_minutes' => $this->averageProcessingMinutes($filters),
        ];
    }

    private function discrepancyTrend(array $filters): array
    {
        return $this->anomalyQuery($filters)
            ->get(['id', 'created_at'])
            ->groupBy(fn (Anomaly $anomaly) => $this->periodKey($anomaly->created_at, $filters['group_by']))
            ->map(fn (Collection $items, string $period) => [
                'period' => $period,
                'total' => $items->count(),
            ])
            ->sortBy('period')
            ->values()
            ->all();
    }

    private function vendorBreakdown(array $filters): array
    {
        return Vendor::query()
            ->when($filters['vendor_id'], fn (Builder $query) => $query->whereKey($filters['vendor_id']))
            ->get()
            ->map(function (Vendor $vendor) use ($filters) {
                $deliveryOrderIds = $this->deliveryOrderQuery(array_merge($filters, ['vendor_id' => $vendor->id]))
                    ->pluck('id');

                $totalDeliveryOrders = $deliveryOrderIds->count();
                $totalAnomalies = $this->anomalyQuery(array_merge($filters, ['vendor_id' => $vendor->id]))
                    ->count();

                return [
                    'vendor_id' => $vendor->id,
                    'vendor_name' => $vendor->name,
                    'total_delivery_orders' => $totalDeliveryOrders,
                    'total_anomalies' => $totalAnomalies,
                    'discrepancy_rate' => $totalDeliveryOrders > 0
                        ? round(($totalAnomalies / $totalDeliveryOrders) * 100, 2)
                        : 0.0,
                ];
            })
            ->filter(fn (array $row) => $row['total_delivery_orders'] > 0 || $row['total_anomalies'] > 0)
            ->sortByDesc('total_anomalies')
            ->values()
            ->all();
    }

    private function anomalyDistribution(array $filters): array
    {
        return $this->anomalyQuery($filters)
            ->get(['discrepancy_type'])
            ->groupBy('discrepancy_type')
            ->map(fn (Collection $items, string $type) => [
                'type' => $type,
                'total' => $items->count(),
            ])
            ->sortByDesc('total')
            ->values()
            ->all();
    }

    private function topProblematicParts(array $filters): array
    {
        return $this->anomalyQuery($filters)
            ->get(['affected_sku'])
            ->groupBy('affected_sku')
            ->map(fn (Collection $items, string $sku) => [
                'sku' => $sku,
                'total_anomalies' => $items->count(),
            ])
            ->sortByDesc('total_anomalies')
            ->take(10)
            ->values()
            ->all();
    }

    private function warehousePerformance(array $filters): array
    {
        return Warehouse::query()
            ->when($filters['warehouse_id'], fn (Builder $query) => $query->whereKey($filters['warehouse_id']))
            ->get()
            ->map(function (Warehouse $warehouse) use ($filters) {
                $warehouseFilters = array_merge($filters, ['warehouse_id' => $warehouse->id]);

                $inboundAnomalies = $this->anomalyQuery($warehouseFilters)
                    ->where('anomaly_type', Anomaly::TYPE_INBOUND_DISCREPANCY)
                    ->count();
                $transitAnomalies = $this->anomalyQuery($warehouseFilters)
                    ->where('anomaly_type', Anomaly::TYPE_TRANSIT_DISCREPANCY)
                    ->count();

                return [
                    'warehouse_id' => $warehouse->id,
                    'warehouse_name' => $warehouse->name,
                    'inbound_anomalies' => $inboundAnomalies,
                    'transit_anomalies' => $transitAnomalies,
                    'total_anomalies' => $inboundAnomalies + $transitAnomalies,
                ];
            })
            ->filter(fn (array $row) => $row['total_anomalies'] > 0)
            ->sortByDesc('total_anomalies')
            ->values()
            ->all();
    }

    private function recentAuditLogs(array $filters): array
    {
        return AuditLog::query()
            ->with(['user.role', 'reference'])
            ->whereBetween('created_at', [$filters['date_from'], $filters['date_to']])
            ->where('action', 'ANOMALY_REVIEWED')
            ->latest()
            ->limit(20)
            ->get()
            ->all();
    }

    private function averageProcessingMinutes(array $filters): float
    {
        $processed = $this->deliveryOrderQuery($filters)
            ->whereNotNull('started_at')
            ->whereNotNull('completed_at')
            ->get(['started_at', 'completed_at']);

        if ($processed->isEmpty()) {
            return 0.0;
        }

        return round($processed->avg(fn (DeliveryOrder $deliveryOrder) => $deliveryOrder->started_at->diffInSeconds($deliveryOrder->completed_at) / 60), 2);
    }

    private function deliveryOrderQuery(array $filters): Builder
    {
        return DeliveryOrder::query()
            ->whereBetween('created_at', [$filters['date_from'], $filters['date_to']])
            ->when($filters['vendor_id'], fn (Builder $query) => $query->where('vendor_id', $filters['vendor_id']))
            ->when($filters['warehouse_id'], fn (Builder $query) => $query->where('warehouse_id', $filters['warehouse_id']))
            ->when($filters['sku'], fn (Builder $query) => $query->whereHas('items', fn (Builder $itemQuery) => $itemQuery->where('sku', $filters['sku'])));
    }

    private function transitQuery(array $filters): Builder
    {
        return Transit::query()
            ->whereBetween('created_at', [$filters['date_from'], $filters['date_to']])
            ->when($filters['vendor_id'], fn (Builder $query) => $query->whereRaw('1 = 0'))
            ->when($filters['sku'], fn (Builder $query) => $query->whereHas('anomalies', fn (Builder $anomalyQuery) => $anomalyQuery->where('affected_sku', $filters['sku'])))
            ->when($filters['warehouse_id'], function (Builder $query) use ($filters) {
                $query->where(function (Builder $warehouseQuery) use ($filters) {
                    $warehouseQuery
                        ->where('origin_warehouse_id', $filters['warehouse_id'])
                        ->orWhere('dest_warehouse_id', $filters['warehouse_id']);
                });
            });
    }

    private function scanResultQuery(array $filters): Builder
    {
        return ScanResult::query()
            ->whereBetween('scanned_at', [$filters['date_from'], $filters['date_to']])
            ->when($filters['vendor_id'] || $filters['warehouse_id'], function (Builder $query) use ($filters) {
                $query->whereHas('deliveryOrder', function (Builder $deliveryOrderQuery) use ($filters) {
                    $deliveryOrderQuery
                        ->when($filters['vendor_id'], fn (Builder $q) => $q->where('vendor_id', $filters['vendor_id']))
                        ->when($filters['warehouse_id'], fn (Builder $q) => $q->where('warehouse_id', $filters['warehouse_id']));
                });
            })
            ->when($filters['sku'], fn (Builder $query) => $query->whereHas('doItem', fn (Builder $itemQuery) => $itemQuery->where('sku', $filters['sku'])));
    }

    private function anomalyQuery(array $filters): Builder
    {
        return Anomaly::query()
            ->whereBetween('created_at', [$filters['date_from'], $filters['date_to']])
            ->when($filters['sku'], fn (Builder $query) => $query->where('affected_sku', $filters['sku']))
            ->when($filters['vendor_id'] || $filters['warehouse_id'], function (Builder $query) use ($filters) {
                if ($filters['vendor_id']) {
                    $query
                        ->where('reference_type', DeliveryOrder::class)
                        ->whereHasMorph('reference', [DeliveryOrder::class], function (Builder $deliveryOrderQuery) use ($filters) {
                            $deliveryOrderQuery
                                ->where('vendor_id', $filters['vendor_id'])
                                ->when($filters['warehouse_id'], fn (Builder $q) => $q->where('warehouse_id', $filters['warehouse_id']));
                        });

                    return;
                }

                $query->where(function (Builder $referenceQuery) use ($filters) {
                    $referenceQuery
                        ->where(function (Builder $deliveryOrderAnomaly) use ($filters) {
                            $deliveryOrderAnomaly
                                ->where('reference_type', DeliveryOrder::class)
                                ->whereHasMorph('reference', [DeliveryOrder::class], function (Builder $deliveryOrderQuery) use ($filters) {
                                    $deliveryOrderQuery->where('warehouse_id', $filters['warehouse_id']);
                                });
                        })
                        ->orWhere(function (Builder $transitAnomaly) use ($filters) {
                            $transitAnomaly
                                ->where('reference_type', Transit::class)
                                ->whereHasMorph('reference', [Transit::class], function (Builder $transitQuery) use ($filters) {
                                    $transitQuery->where(function (Builder $warehouseQuery) use ($filters) {
                                        $warehouseQuery
                                            ->where('origin_warehouse_id', $filters['warehouse_id'])
                                            ->orWhere('dest_warehouse_id', $filters['warehouse_id']);
                                    });
                                });
                        });
                });
            });
    }

    private function periodKey(Carbon $date, string $groupBy): string
    {
        return match ($groupBy) {
            'week' => $date->copy()->startOfWeek()->toDateString(),
            'month' => $date->format('Y-m'),
            default => $date->toDateString(),
        };
    }

    private function paginateCollection(Collection $items, int $perPage, int $page, string $path, array $query): LengthAwarePaginator
    {
        return new Paginator(
            $items->forPage($page, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            [
                'path' => $path,
                'query' => $query,
            ]
        );
    }
}
