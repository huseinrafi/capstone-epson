<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Login Route
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes (Group with Auth via JWT API guard)
Route::group(['middleware' => 'auth:api'], function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Operator-only routes placeholders
    Route::group(['middleware' => ['role:operator_checker']], function () {
        Route::post('/scan/inbound', [\App\Http\Controllers\InboundScannerController::class, 'scanInbound']);
        Route::post('/scan/transit/in', function () { return "transit in ok"; });
        Route::post('/scan/transit/out', function () { return "transit out ok"; });
    });

    // Admin-only route
    Route::group(['middleware' => ['role:admin_gudang,supervisor']], function () {
        Route::get('/delivery-orders', [\App\Http\Controllers\AdminController::class, 'getDeliveryOrders']);
    });

    // Supervisor-only route
    Route::group(['middleware' => ['role:supervisor']], function () {
        Route::get('/anomalies', [\App\Http\Controllers\SupervisorController::class, 'getPendingAnomalies']);
        Route::post('/anomalies/{id}/resolve', [\App\Http\Controllers\SupervisorController::class, 'resolveAnomaly']);
    });

    // Manager dashboard
    Route::group(['middleware' => ['role:manajer,supervisor']], function () {
        Route::get('/dashboard/stats', [\App\Http\Controllers\ManagerController::class, 'getAnalytics']);
    });
});
