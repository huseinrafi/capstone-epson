<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnomalyEvidenceRequest;
use App\Models\Anomaly;
use App\Models\AuditLog;
use App\Models\Evidence;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class AnomalyEvidenceController extends Controller
{
    use ApiResponse;

    public function store(StoreAnomalyEvidenceRequest $request, Anomaly $anomaly): JsonResponse
    {
        $validated = $request->validated();
        $photo = $request->file('photo');
        $fileHash = hash_file('sha256', $photo->getRealPath());
        $path = $photo->store("anomaly-evidences/{$anomaly->id}", 'public');

        $evidence = Evidence::create([
            'anomaly_id' => $anomaly->id,
            'uploader_id' => $request->user('api')->id,
            'file_path' => $path,
            'file_url' => Storage::disk('public')->url($path),
            'file_hash' => $fileHash,
            'mime_type' => $photo->getMimeType(),
            'file_size_bytes' => $photo->getSize(),
            'taken_at' => $validated['taken_at'] ?? now(),
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'device_id' => $validated['device_id'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        AuditLog::create([
            'user_id' => $request->user('api')->id,
            'action' => 'ANOMALY_EVIDENCE_UPLOADED',
            'reference_type' => Anomaly::class,
            'reference_id' => $anomaly->id,
            'new_value' => [
                'evidence_id' => $evidence->id,
                'file_hash' => $evidence->file_hash,
                'device_id' => $evidence->device_id,
                'taken_at' => $evidence->taken_at?->toISOString(),
                'latitude' => $evidence->latitude,
                'longitude' => $evidence->longitude,
            ],
            'ip_address' => $request->ip(),
        ]);

        return $this->successResponse(
            $evidence->load(['uploader.role']),
            'Bukti digital berhasil diunggah.',
            201
        );
    }
}
