<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Anomaly;
use App\Models\ScanResult;

class SupervisorController extends Controller
{
    /**
     * Melihat semua anomali yang butuh direview.
     */
    public function getPendingAnomalies()
    {
        // Ambil anomali beserta relasi manual ke resultnya
        $anomalies = Anomaly::where('status', 'PENDING_REVIEW')->get();
        
        $anomalies->transform(function($anomaly) {
            $scanResult = ScanResult::find($anomaly->scan_result_id);
            if ($scanResult) {
                // Attach the operator name too if needed, but for simplicity:
                $operator = \App\Models\User::find($scanResult->operator_id);
                $node = \Illuminate\Support\Facades\DB::table('nodes')->where('id', $scanResult->node_id)->first();
                
                $scanResult->operator_name = $operator ? $operator->name : 'Unknown';
                $scanResult->node_name = $node ? $node->name : 'Unknown Node';
            }
            $anomaly->scan_detail = $scanResult;
            return $anomaly;
        });

        return response()->json($anomalies);
    }

    /**
     * Resolusi: Approve (MATCH manual) atau REJECT.
     */
    public function resolveAnomaly(Request $request, $id)
    {
        $request->validate([
            'resolution' => 'required|in:RESOLVED,REJECTED'
        ]);

        $anomaly = Anomaly::findOrFail($id);
        
        if ($anomaly->status !== 'PENDING_REVIEW') {
            return response()->json(['error' => 'Anomali ini sudah ditindaklanjuti.'], 400);
        }

        $anomaly->update([
            'status' => $request->resolution,
            'resolved_at' => now(),
            // optional: resolved_by_id => Auth::id()
        ]);

        return response()->json(['message' => 'Anomali berhasil diselesaikan dengan status: ' . $request->resolution]);
    }
}
