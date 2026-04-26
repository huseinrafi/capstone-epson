<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryOrder;
use App\Models\DOItem;
use App\Models\ScanResult;
use App\Models\InternalItem;
use App\Models\Anomaly;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InboundScannerController extends Controller
{
    /**
     * Endpoint for Inbound Scanning
     * POST /api/scan/inbound
     */
    public function scanInbound(Request $request)
    {
        $request->validate([
            'barcode' => 'required|string',
            'delivery_order_id' => 'required|exists:delivery_orders,id',
        ]);

        $user = Auth::guard('api')->user();
        
        /** @var \PHPOpenSourceSaver\JWTAuth\JWTGuard $guard */
        $guard = Auth::guard('api');
        
        $jwtPayload = $guard->payload();
        $nodeId = $jwtPayload->get('node_id');

        if (!$nodeId) {
            return response()->json(['error' => 'Node ID (Lokasi kerja) tidak ditemukan di Sesi Login Anda.'], 403);
        }

        $doId = $request->delivery_order_id;
        $scannedBarcode = $request->barcode;

        // Start Transaction Database
        return DB::transaction(function () use ($doId, $scannedBarcode, $user, $nodeId) {
            
            // 1. Cek apakah DO Item dengan vendor_barcode ini ada di Delivery Order tersebut
            $doItem = DOItem::where('delivery_order_id', $doId)
                            ->where('vendor_barcode', $scannedBarcode)
                            ->first();

            $status = 'NOT_FOUND';

            if ($doItem) {
                // Cek apakah kuantitas yang di-scan tidak melebihi yang diexpect
                if ($doItem->scanned_qty < $doItem->expected_qty) {
                    $status = 'MATCH';
                    $doItem->increment('scanned_qty');
                } else {
                    $status = 'OVER';
                }
            }

            // 2. Insert ke Tabel ScanResult
            $scanResult = ScanResult::create([
                'delivery_order_id' => $doId,
                'vendor_barcode' => $scannedBarcode,
                'status' => $status,
                'operator_id' => $user->id,
                'node_id' => $nodeId,
            ]);

            $responsePayload = [
                'status' => $status,
                'scan_id' => $scanResult->id,
            ];

            // 3. Logic: Jika MATCH -> Generate EPS Barcode (Sistem Verifikasi Selesai sukses)
            if ($status === 'MATCH') {
                $internalBarcode = $this->generateEan13Barcode();
                
                $internalItem = InternalItem::create([
                    'internal_barcode' => $internalBarcode,
                    'vendor_barcode' => $scannedBarcode,
                    'current_node_id' => $nodeId,
                    'status' => 'IN_WAREHOUSE'
                ]);

                $responsePayload['internal_barcode'] = $internalBarcode;
                $responsePayload['message'] = 'MATCH! Barcode Internal SVSB Berhasil Dibuat.';
                
            } else {
                // 4. Logic: Jika Bukan MATCH (MISMATCH, OVER, NOT_FOUND) -> Masukkan ke Anomaly
                Anomaly::create([
                    'scan_result_id' => $scanResult->id,
                    'status' => 'PENDING_REVIEW'
                ]);
                
                $responsePayload['message'] = 'ANOMALI TERDETEKSI: ' . $status . '. Proses membutuhkan Review Supervisor.';
            }

            return response()->json($responsePayload, 200);
        });
    }

    /**
     * Helper to generate Valid 13-Digit EAN-13 Barcode
     */
    private function generateEan13Barcode()
    {
        $date = now()->format('ymd'); // 6 digits: e.g., 260426
        $prefix = "20" . $date; // standard internal starting prefix (20 = in-store type)

        // Dapatkan counter hari ini
        $latest = InternalItem::where('internal_barcode', 'like', "{$prefix}%")
                              ->orderBy('internal_barcode', 'desc')
                              ->first();

        $sequence = 1;
        if ($latest) {
            $lastSequence = (int) substr($latest->internal_barcode, 8, 4);
            $sequence = $lastSequence + 1;
        }

        $paddedSequence = str_pad($sequence, 4, '0', STR_PAD_LEFT);
        $coreDigits = $prefix . $paddedSequence; // 20 + 260426 + 0001 = 12 digits

        // EAN-13 Checksum Calculation
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $digit = (int) $coreDigits[$i];
            $sum += ($i % 2 === 0) ? $digit : $digit * 3;
        }

        $checkDigit = (10 - ($sum % 10)) % 10;

        return $coreDigits . $checkDigit;
    }
}
