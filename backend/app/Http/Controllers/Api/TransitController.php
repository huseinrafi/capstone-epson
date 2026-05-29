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
use Illuminate\Validation\ValidationException;

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

        // Koreksi Celah 5: Bersihkan array input dari potensi manipulasi data ganda
        $validated['internal_item_ids'] = array_unique($validated['internal_item_ids']);

        $transit = DB::transaction(function () use ($validated, $request) {
            $items = InternalItem::query()
                ->whereIn('id', $validated['internal_item_ids'])
                ->lockForUpdate()
                ->get();

            // Koreksi Celah 1: Melempar exception standar Laravel
            if ($items->count() !== count($validated['internal_item_ids'])) {
                throw ValidationException::withMessages([
                    'internal_item_ids' => ['Ada komponen boks internal yang tidak terdaftar di sistem.']
                ]);
            }

            $invalidItems = $items->filter(
                fn($item) => $item->current_warehouse_id !== $validated['origin_warehouse_id']
                || $item->status !== InternalItem::STATUS_AVAILABLE
            );

            if ($invalidItems->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'internal_item_ids' => ['Ada komponen boks yang lokasinya tidak sesuai atau terlibat transaksi lain.']
                ]);
            }

            // Koreksi Celah 1 (Penting): Generasi sekuensial. 
            // Catatan: Anda WAJIB menambahkan $table->string('transit_number')->unique() di migrasi database.
            $datePrefix = now()->format('Ymd');
            $lastTransit = Transit::query()
                ->whereDate('created_at', now()->toDateString())
                ->lockForUpdate() 
                ->latest('id')
                ->first();

            $sequence = $lastTransit ? ((int) substr($lastTransit->transit_number, -4)) + 1 : 1;
            $transitNumber = 'TRX-' . $datePrefix . '-' . str_pad($sequence, 4, '0', STR_PAD_LEFT);

            // Koreksi Celah 10: Hapus ketergantungan properti sent_total yang membingungkan audit trail
            $transit = Transit::create([
                'transit_number' => $transitNumber,
                'origin_warehouse_id' => $validated['origin_warehouse_id'],
                'dest_warehouse_id' => $validated['dest_warehouse_id'],
                'created_by' => $request->user('api')->id,
                'status' => Transit::STATUS_TRANSIT_INIT,
                'expected_total' => $items->count(),
                'received_total' => 0,
            ]);

            foreach ($items as $item) {
                TransitItem::create([
                    'transit_id' => $transit->id,
                    'internal_item_id' => $item->id,
                    'transit_status' => TransitItem::STATUS_PENDING,
                ]);
            }

            return $transit->load(['originWarehouse', 'destinationWarehouse', 'creator.role']);
        ]);

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

    public function scans(TransitScanRequest $request, Transit $transit): JsonResponse
    {
        return DB::transaction(function () use ($request, $transit) {
            // Koreksi Celah 8: Kunci data induk Transit di awal transaksi untuk mengamankan konsistensi status dokumen
            $transit = Transit::query()->lockForUpdate()->findOrFail($transit->id);

            // Koreksi Celah 6: Pembekuan total operasi scan jika dokumen sudah selesai atau mendeteksi anomali
            if (in_array($transit->status, [Transit::STATUS_TRANSIT_COMPLETED, Transit::STATUS_INVESTIGATION_REQUIRED], true)) {
                return $this->badRequestResponse('Operasi pemindaian dibekukan. Status dokumen memerlukan investigasi supervisor.');
            }

            // Koreksi Celah 9: Normalisasi dua sisi (Uppercase & Trim) untuk mengantisipasi sensitivitas mesin database
            $normalizedBarcode = strtoupper(trim($request->validated('barcode')));
            $item = $this->findTransitItemByBarcode($transit, $normalizedBarcode);

            // Skenario A: Barcode Tidak Terdaftar dalam Batch (EXCESSIVE)
            if (!$item) {
                $transit->update(['status' => Transit::STATUS_INVESTIGATION_REQUIRED]);
                
                // Koreksi Celah 4: Hitung nilai aktual riil langsung dari database agregat
                $currentScannedCount = $transit->items()->where('transit_status', TransitItem::STATUS_SCANNED_OUT)->count();
                
                $anomaly = $this->createTransitAnomaly(
                    $transit,
                    Anomaly::DISCREPANCY_OVER,
                    substr($normalizedBarcode, 0, 50),
                    $transit->expected_total,
                    $currentScannedCount + 1,
                    $request
                );

                return $this->badRequestResponse(
                    'Barcode tidak terdaftar dalam dokumen batch transit ini. Operasi otomatis dikunci.',
                    [
                        'requires_evidence' => true,
                        'anomaly_id' => $anomaly->id,
                        'evidence_upload_url' => "/api/v1/anomalies/{$anomaly->id}/evidences",
                    ]
                );
            }

            // Skenario B: Duplikasi scan boks fisik di lokasi asal
            if ($item->transit_status === TransitItem::STATUS_SCANNED_OUT) {
                return $this->badRequestResponse('Boks komparasi sudah berada di dalam daftar muat troli.');
            }

            // Koreksi Celah 3: Amankan rekam jejak keluar boks (Fase 1: Muat Barang)
            $item->update([
                'transit_status' => TransitItem::STATUS_SCANNED_OUT,
                'scan_out_by' => $request->user('api')->id,
                'scanned_out_at' => now(),
                'scan_in_by' => null,
                'scanned_in_at' => null,
            ]);

            // Mutasi status item fisik menjadi sedang bergerak di dalam lorong pabrik
            $item->internalItem->update(['status' => InternalItem::STATUS_IN_TRANSIT]);

            // Koreksi Celah 2: Gunakan Conditional Update atomic untuk mencegah lost update status dokumen induk
            Transit::query()
                ->where('id', $transit->id)
                ->where('status', Transit::STATUS_TRANSIT_INIT)
                ->update(['status' => Transit::STATUS_IN_TRANSIT]);

            return $this->successResponse(
                $item->fresh(['internalItem', 'scanOutOperator.role']),
                'Boks terverifikasi masuk ke dalam daftar muat troli.'
            );
        });
    }

    public function finish(Request $request, Transit $transit): JsonResponse
    {
        return DB::transaction(function () use ($request, $transit) {
            // Koreksi Celah 8: Kunci data induk Transit sebelum menutup transaksi massal
            $transit = Transit::query()->lockForUpdate()->findOrFail($transit->id);

            if ($transit->status === Transit::STATUS_TRANSIT_COMPLETED) {
                return $this->badRequestResponse('Dokumen transaksi logistik ini sudah berstatus ditutup.');
            }

            $currentScannedCount = $transit->items()->where('transit_status', TransitItem::STATUS_SCANNED_OUT)->count();

            // Koreksi Celah 4: Validasi minimum scan. Tolak eksekusi jika operator belum menscan satu pun boks barang
            if ($currentScannedCount === 0) {
                return $this->badRequestResponse('Gagal menutup dokumen. Anda belum memindai satu pun boks biner ke dalam troli.');
            }

            $missingItemsCount = $transit->items()->where('transit_status', TransitItem::STATUS_PENDING)->count();

            // Skenario A: Transit Mengalami Selisih Kurang (MISSING)
            if ($missingItemsCount > 0) {
                $transit->items()->where('transit_status', TransitItem::STATUS_PENDING)->update([
                    'transit_status' => TransitItem::STATUS_MISSING
                ]);

                if (!$this->hasPendingMissingTransitAnomaly($transit)) {
                    $anomaly = $this->createTransitAnomaly(
                        $transit,
                        Anomaly::DISCREPANCY_MISSING,
                        'MULTIPLE_ITEMS_MISSING',
                        $transit->expected_total,
                        $currentScannedCount,
                        $request
                    );
                }

                // Koreksi Celah 7: Selalu sinkronkan hitungan field cache berdasarkan kalkulasi DB aktual
                $transit->update([
                    'status' => Transit::STATUS_INVESTIGATION_REQUIRED,
                    'arrived_at' => now(),
                    'received_total' => $currentScannedCount
                ]);

                return $this->successResponse(
                    array_merge(
                        $transit->fresh(['items.internalItem'])->toArray(),
                        [
                            'requires_evidence' => true,
                            'anomaly_id' => isset($anomaly) ? $anomaly->id : null,
                        ]
                    ),
                    'Transit ditutup dengan selisih kurang! Sistem memaksa operator mengambil bukti rekaman kamera.'
                );
            }

            // Skenario B: Jalur Lulus Sempurna (Match 100%) - Koreksi Celah 6 (Bulk Update No N+1 Query)
            $scannedItemEntries = $transit->items()->where('transit_status', TransitItem::STATUS_SCANNED_OUT)->get();
            $internalItemIds = $scannedItemEntries->pluck('internal_item_id')->toArray();

            // 1. Mutasi Lokasi Fisik Massal di DB
            InternalItem::whereIn('id', $internalItemIds)->update([
                'current_warehouse_id' => $transit->dest_warehouse_id,
                'status' => InternalItem::STATUS_AVAILABLE,
                'updated_at' => now()
            ]);

            // 2. Koreksi Celah 3 (Fase 2): Rekam jejak masuk massal (Scan-In terotomatisasi timestamp penutupan)
            $transit->items()->where('transit_status', TransitItem::STATUS_SCANNED_OUT)->update([
                'transit_status' => TransitItem::STATUS_SCANNED_IN,
                'scan_in_by' => $request->user('api')->id,
                'scanned_in_at' => now(),
                'updated_at' => now()
            ]);

            $finalReceivedCount = $transit->items()->where('transit_status', TransitItem::STATUS_SCANNED_IN)->count();

            $transit->update([
                'status' => Transit::STATUS_TRANSIT_COMPLETED,
                'arrived_at' => now(),
                'received_total' => $finalReceivedCount // Terjaga kebersihannya dari out-of-sync
            ]);

            return $this->successResponse(
                $transit->fresh(['items.internalItem']),
                'Seluruh pergerakan komponen boks tervalidasi utuh di gudang tujuan.'
            );
        });
    }

    private function findTransitItemByBarcode(Transit $transit, string $barcode): ?TransitItem
    {
        // Koreksi Celah 3: Gunakan UPPER pencarian mentah untuk memotong hambatan kapitalisasi mesin database
        return TransitItem::query()
            ->where('transit_id', $transit->id)
            ->whereHas('internalItem', fn($query) => $query->whereRaw('UPPER(internal_barcode) = ?', [$barcode]))
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
}