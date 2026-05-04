<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWarehouseRequest;
use App\Http\Requests\UpdateWarehouseRequest;
use App\Models\Warehouse;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $warehouses = Warehouse::query()
            ->when($request->q, function ($query, string $keyword) {
                $query->where(function ($search) use ($keyword) {
                    $search
                        ->where('code', 'like', "%{$keyword}%")
                        ->orWhere('name', 'like', "%{$keyword}%")
                        ->orWhere('location', 'like', "%{$keyword}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($warehouses, 'Data warehouse berhasil diambil.');
    }

    public function store(StoreWarehouseRequest $request): JsonResponse
    {
        $warehouse = Warehouse::create($request->validated());

        return $this->successResponse($warehouse, 'Warehouse berhasil ditambahkan.', 201);
    }

    public function show(Warehouse $warehouse): JsonResponse
    {
        return $this->successResponse($warehouse, 'Detail warehouse berhasil diambil.');
    }

    public function update(UpdateWarehouseRequest $request, Warehouse $warehouse): JsonResponse
    {
        $warehouse->update($request->validated());

        return $this->successResponse($warehouse->fresh(), 'Warehouse berhasil diperbarui.');
    }

    public function destroy(Warehouse $warehouse): JsonResponse
    {
        try {
            $warehouse->delete();
        } catch (QueryException) {
            return $this->badRequestResponse('Warehouse tidak dapat dihapus karena sudah dipakai transaksi.');
        }

        return $this->successResponse(null, 'Warehouse berhasil dihapus.');
    }
}
