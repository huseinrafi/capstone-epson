<?php

namespace App\Http\Requests;

class StoreWarehouseRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:20', 'unique:warehouses,code'],
            'name' => ['required', 'string', 'max:100'],
            'location' => ['required', 'string', 'max:200'],
        ];
    }
}
