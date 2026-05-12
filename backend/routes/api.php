<?php

use App\Http\Controllers\Api\AnomalyEvidenceController;
use App\Http\Controllers\Api\AnomalyReviewController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardAnalyticsController;
use App\Http\Controllers\Api\DeliveryOrderController;
use App\Http\Controllers\Api\InboundScanController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\OperationalNotificationController;
use App\Http\Controllers\Api\SupervisorNotificationController;
use App\Http\Controllers\Api\TransitController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware('role:operator_checker,admin_gudang,supervisor,manajer')->group(function () {
            Route::get('/lookups/vendors', [LookupController::class, 'vendors']);
            Route::get('/lookups/warehouses', [LookupController::class, 'warehouses']);
            Route::get('/lookups/skus', [LookupController::class, 'skus']);
            Route::get('/lookups/anomaly-options', [LookupController::class, 'anomalyOptions']);

            Route::get('/items/barcode/{barcode}', [ItemController::class, 'showByBarcode']);
            Route::get('/delivery-orders/queue', [DeliveryOrderController::class, 'queue']);
            Route::get('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'show']);

            Route::post('/delivery-orders/{delivery_order}/inbound/start', [InboundScanController::class, 'start']);
            Route::post('/delivery-orders/{delivery_order}/inbound/scans', [InboundScanController::class, 'scan']);
            Route::post('/delivery-orders/{delivery_order}/inbound/finish', [InboundScanController::class, 'finish']);

            Route::post('/anomalies/{anomaly}/evidences', [AnomalyEvidenceController::class, 'store']);

            Route::get('/notifications', [OperationalNotificationController::class, 'index']);
            Route::patch('/notifications/{notification}/read', [OperationalNotificationController::class, 'markAsRead']);

            Route::get('/transits', [TransitController::class, 'index']);
            Route::get('/transits/{transit}', [TransitController::class, 'show']);
            Route::post('/transits/{transit}/scan-out', [TransitController::class, 'scanOut']);
            Route::post('/transits/{transit}/depart', [TransitController::class, 'depart']);
            Route::post('/transits/{transit}/scan-in', [TransitController::class, 'scanIn']);
            Route::post('/transits/{transit}/complete', [TransitController::class, 'complete']);
        });

        Route::middleware('role:admin_gudang,supervisor,manajer')->group(function () {
            Route::get('/delivery-orders', [DeliveryOrderController::class, 'index']);
            Route::post('/delivery-orders', [DeliveryOrderController::class, 'store']);
            Route::apiResource('/items', ItemController::class);
            Route::apiResource('/vendors', VendorController::class);
            Route::apiResource('/warehouses', WarehouseController::class);

            Route::post('/transits', [TransitController::class, 'store']);
        });

        Route::middleware('role:supervisor,manajer')->group(function () {
            Route::put('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'update']);
            Route::patch('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'update']);
            Route::delete('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'destroy']);

            Route::get('/anomalies/review-queue', [AnomalyReviewController::class, 'index']);
            Route::get('/anomalies/{anomaly}', [AnomalyReviewController::class, 'show']);
            Route::post('/anomalies/{anomaly}/review', [AnomalyReviewController::class, 'review']);

            Route::get('/supervisor-notifications', [SupervisorNotificationController::class, 'index']);
            Route::patch('/supervisor-notifications/{notification}/read', [SupervisorNotificationController::class, 'markAsRead']);
        });

        Route::middleware('role:supervisor,manajer')->group(function () {
            Route::get('/dashboard/overview', [DashboardAnalyticsController::class, 'overview']);
            Route::get('/dashboard/anomalies/drilldown', [DashboardAnalyticsController::class, 'anomalyDrilldown']);
            Route::get('/dashboard/transactions/drilldown', [DashboardAnalyticsController::class, 'transactionDrilldown']);

            Route::get('/lookups/roles', [LookupController::class, 'roles']);
            Route::get('/user-management/users', [UserManagementController::class, 'index']);
            Route::get('/user-management/users/{user}', [UserManagementController::class, 'show']);
            Route::post('/user-management/users', [UserManagementController::class, 'store']);
            Route::put('/user-management/users/{user}', [UserManagementController::class, 'update']);
            Route::patch('/user-management/users/{user}', [UserManagementController::class, 'update']);
            Route::patch('/user-management/users/{user}/password', [UserManagementController::class, 'resetPassword']);
            Route::delete('/user-management/users/{user}', [UserManagementController::class, 'destroy']);
        });
    });
});
