<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DeliveryOrderController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\InboundScanController;
use Illuminate\Support\Facades\Route;

Route::prefix("v1")->group(function () {
    Route::post("/auth/register", [AuthController::class, "register"]);
    Route::post("/auth/login", [AuthController::class, "login"]);

    Route::middleware('auth:api')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware('role:operator_checker,admin_gudang,supervisor,manajer')->group(function () {
            Route::get('/items/barcode/{barcode}', [ItemController::class, 'showByBarcode']);
            Route::get('/delivery-orders/queue', [DeliveryOrderController::class, 'queue']);
            Route::get('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'show']);

            Route::post('/delivery-orders/{delivery_order}/inbound/start', [InboundScanController::class, 'start']);
            Route::post('/delivery-orders/{delivery_order}/inbound/scans', [InboundScanController::class, 'scan']);
            Route::post('/delivery-orders/{delivery_order}/inbound/finish', [InboundScanController::class, 'finish']);
        });

        Route::middleware('role:admin_gudang,supervisor,manajer')->group(function () {
            Route::get('/delivery-orders', [DeliveryOrderController::class, 'index']);
            Route::post('/delivery-orders', [DeliveryOrderController::class, 'store']);
            Route::apiResource('/items', ItemController::class);
        });

        Route::middleware('role:supervisor,manajer')->group(function () {
            Route::put('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'update']);
            Route::patch('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'update']);
            Route::delete('/delivery-orders/{delivery_order}', [DeliveryOrderController::class, 'destroy']);
        });
    });
});
