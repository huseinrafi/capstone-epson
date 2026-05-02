<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupervisorNotification;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupervisorNotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $notifications = SupervisorNotification::query()
            ->with(['anomaly.reference'])
            ->where('user_id', $request->user('api')->id)
            ->when($request->boolean('unread_only'), fn ($query) => $query->whereNull('read_at'))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($notifications, 'Notifikasi supervisor berhasil diambil.');
    }

    public function markAsRead(Request $request, SupervisorNotification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user('api')->id) {
            return $this->notFoundResponse('Notifikasi tidak ditemukan.');
        }

        $notification->update([
            'read_at' => $notification->read_at ?? now(),
        ]);

        return $this->successResponse($notification->fresh(['anomaly']), 'Notifikasi ditandai sudah dibaca.');
    }
}
