<?php

namespace App\Http\Requests;

class StoreInboundScanRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'barcode' => ['required', 'string', 'max:100'],
            'sku' => ['nullable', 'string', 'max:50'],
            'device_id' => ['nullable', 'string', 'max:50'],
        ];
    }
}
