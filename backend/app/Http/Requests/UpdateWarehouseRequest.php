<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class UpdateWarehouseRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $warehouse = $this->route('warehouse');

        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('warehouses', 'code')->ignore($warehouse?->id)],
            'name' => ['required', 'string', 'max:100'],
            'location' => ['required', 'string', 'max:200'],
        ];
    }
}
