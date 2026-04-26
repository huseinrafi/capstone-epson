<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function successResponse(
        mixed $data = null,
        string $message = 'Berhasil.',
        int $statusCode = 200
    ): JsonResponse {
        $response = [
            'success' => true,
            'message' => $message,
        ];

        if (!is_null($data)) {
            $response['data'] = $data;
        }

        return response()->json($response, $statusCode);
    }

    protected function errorResponse(
        string $message = 'Terjadi kesalahan.',
        int $statusCode = 400,
        mixed $errors = null
    ): JsonResponse {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if (!is_null($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $statusCode);
    }

    protected function badRequestResponse(string $message = 'Request tidak valid.', mixed $errors = null): JsonResponse
    {
        return $this->errorResponse($message, 400, $errors);
    }

    protected function unauthorizedResponse(string $message = 'Unauthenticated.'): JsonResponse
    {
        return $this->errorResponse($message, 401);
    }

    protected function forbiddenResponse(string $message = 'Akses ditolak.'): JsonResponse
    {
        return $this->errorResponse($message, 403);
    }

    protected function notFoundResponse(string $message = 'Data tidak ditemukan.'): JsonResponse
    {
        return $this->errorResponse($message, 404);
    }

    protected function serverErrorResponse(string $message = 'Terjadi kesalahan server.'): JsonResponse
    {
        return $this->errorResponse($message, 500);
    }
}
