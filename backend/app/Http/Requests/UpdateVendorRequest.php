<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class UpdateVendorRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $vendor = $this->route('vendor');

        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('vendors', 'code')->ignore($vendor?->id)],
            'name' => ['required', 'string', 'max:150'],
            'contact_name' => ['nullable', 'string', 'max:100'],
            'contact_phone' => ['nullable', 'string', 'max:20'],
            'address' => ['required', 'string'],
        ];
    }
}
