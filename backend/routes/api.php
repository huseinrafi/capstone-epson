<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ItemController;
use Illuminate\Support\Facades\Route;

Route::prefix("v1")->group(function () {
    Route::post("/auth/register", [AuthController::class, "register"]);
    Route::post("/auth/login", [AuthController::class, "login"]);

    Route::middleware('auth:api')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::middleware('role:operator_checker,admin_gudang,supervisor,manajer')->group(function () {
            Route::get('/items/barcode/{barcode}', [ItemController::class, 'showByBarcode']);
        });

        Route::middleware('role:admin_gudang,supervisor,manajer')->group(function () {
            Route::apiResource('/items', ItemController::class);
        });
    });
});
