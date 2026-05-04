<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVendorRequest;
use App\Http\Requests\UpdateVendorRequest;
use App\Models\Vendor;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $vendors = Vendor::query()
            ->when($request->q, function ($query, string $keyword) {
                $query->where(function ($search) use ($keyword) {
                    $search
                        ->where('code', 'like', "%{$keyword}%")
                        ->orWhere('name', 'like', "%{$keyword}%")
                        ->orWhere('contact_name', 'like', "%{$keyword}%");
                });
            })
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($vendors, 'Data vendor berhasil diambil.');
    }

    public function store(StoreVendorRequest $request): JsonResponse
    {
        $vendor = Vendor::create($request->validated());

        return $this->successResponse($vendor, 'Vendor berhasil ditambahkan.', 201);
    }

    public function show(Vendor $vendor): JsonResponse
    {
        return $this->successResponse($vendor, 'Detail vendor berhasil diambil.');
    }

    public function update(UpdateVendorRequest $request, Vendor $vendor): JsonResponse
    {
        $vendor->update($request->validated());

        return $this->successResponse($vendor->fresh(), 'Vendor berhasil diperbarui.');
    }

    public function destroy(Vendor $vendor): JsonResponse
    {
        try {
            $vendor->delete();
        } catch (QueryException) {
            return $this->badRequestResponse('Vendor tidak dapat dihapus karena sudah dipakai transaksi.');
        }

        return $this->successResponse(null, 'Vendor berhasil dihapus.');
    }
}
