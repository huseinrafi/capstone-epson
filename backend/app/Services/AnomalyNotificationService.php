<?php

namespace App\Services;

use App\Constants\RoleConstant;
use App\Models\Anomaly;
use App\Models\OperationalNotification;
use App\Models\User;

class AnomalyNotificationService
{
    public function notifySupervisorsForNewAnomaly(Anomaly $anomaly): void
    {
        $this->notifyRole(
            RoleConstant::SUPERVISOR_SLUG,
            $anomaly,
            'ANOMALY_REVIEW_REQUIRED',
            'Anomali perlu review',
            sprintf(
                'Anomali %s pada SKU %s perlu ditinjau.',
                $anomaly->discrepancy_type,
                $anomaly->affected_sku
            ),
            "/api/v1/anomalies/{$anomaly->id}"
        );
    }

    public function notifyAfterReview(Anomaly $anomaly, string $decision): void
    {
        match ($decision) {
            'APPROVE' => $this->notifyRole(
                RoleConstant::ADMIN_GUDANG_SLUG,
                $anomaly,
                'ANOMALY_APPROVED',
                'Anomali disetujui',
                'Sesi anomali sudah selesai.',
                "/api/v1/anomalies/{$anomaly->id}"
            ),
            'RETURN' => $this->notifyRole(
                RoleConstant::ADMIN_GUDANG_SLUG,
                $anomaly,
                'ANOMALY_RETURNED',
                'Barang perlu dikembalikan',
                'Supervisor meminta proses pengembalian fisik ke vendor.',
                "/api/v1/anomalies/{$anomaly->id}"
            ),
            'RECOUNT' => $this->notifyReporter(
                $anomaly,
                'ANOMALY_RECOUNT',
                'Scan ulang diperlukan',
                'Supervisor meminta scan ulang dari awal.',
                "/api/v1/anomalies/{$anomaly->id}"
            ),
            'HOLD' => null,
        };
    }

    private function notifyRole(
        string $roleSlug,
        Anomaly $anomaly,
        string $type,
        string $title,
        string $message,
        ?string $url
    ): void {
        User::query()
            ->where('is_active', true)
            ->whereHas('role', fn($query) => $query->where('slug', $roleSlug))
            ->each(fn(User $user) => OperationalNotification::create([
                'user_id' => $user->id,
                'anomaly_id' => $anomaly->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $url,
            ]));
    }

    private function notifyReporter(
        Anomaly $anomaly,
        string $type,
        string $title,
        string $message,
        ?string $url
    ): void {
        if (!$anomaly->reported_by) {
            return;
        }

        OperationalNotification::create([
            'user_id' => $anomaly->reported_by,
            'anomaly_id' => $anomaly->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $url,
        ]);
    }
}
