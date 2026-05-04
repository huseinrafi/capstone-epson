<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OperationalNotification;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperationalNotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $notifications = OperationalNotification::query()
            ->with(['anomaly.reference'])
            ->where('user_id', $request->user('api')->id)
            ->when($request->boolean('unread_only'), fn($query) => $query->whereNull('read_at'))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($notifications, 'Notifikasi operasional berhasil diambil.');
    }

    public function markAsRead(Request $request, OperationalNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user('api')->id) {
            return $this->notFoundResponse('Notifikasi tidak ditemukan.');
        }

        $notification->update([
            'read_at' => $notification->read_at ?? now(),
        ]);

        return $this->successResponse(
            $notification->fresh(['anomaly']),
            'Notifikasi ditandai sudah dibaca.'
        );
    }
}
