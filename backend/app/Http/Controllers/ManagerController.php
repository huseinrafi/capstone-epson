<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ScanResult;
use App\Models\InternalItem;
use App\Models\Anomaly;
use App\Models\DeliveryOrder;

class ManagerController extends Controller
{
    /**
     * Kembalikan summary analytics untuk dasbor manajer.
     */
    public function getAnalytics()
    {
        $today = now()->startOfDay();

        $totalScansToday = ScanResult::where('created_at', '>=', $today)->count();
        $totalMatchesToday = ScanResult::where('created_at', '>=', $today)->where('status', 'MATCH')->count();
        $totalAnomaliesToday = Anomaly::where('created_at', '>=', $today)->count();
        $pendingAnomalies = Anomaly::where('status', 'PENDING_REVIEW')->count();

        // Hitung persentase kepuasan harian (Matches vs Total)
        $accuracyRate = $totalScansToday > 0 ? round(($totalMatchesToday / $totalScansToday) * 100, 1) : 100;

        // Data 7 hari terakhir untuk line chart (Sederhana)
        $chartData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            
            $dayMatches = ScanResult::whereDate('created_at', $date)->where('status', 'MATCH')->count();
            $dayAnomalies = Anomaly::whereDate('created_at', $date)->count();

            $chartData[] = [
                'date' => $date,
                'matches' => $dayMatches,
                'anomalies' => $dayAnomalies,
            ];
        }

        return response()->json([
            'cards' => [
                'total_scans_today' => $totalScansToday,
                'total_matches_today' => $totalMatchesToday,
                'total_anomalies_today' => $totalAnomaliesToday,
                'pending_anomalies' => $pendingAnomalies,
                'accuracy_rate' => $accuracyRate
            ],
            'chart' => $chartData
        ]);
    }
}
