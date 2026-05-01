<?php

namespace App\Http\Requests;

class StoreDeliveryOrderRequest extends ApiFormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'do_number' => ['required', 'string', 'max:50', 'unique:delivery_orders,do_number'],
            'vendor_id' => ['required', 'uuid', 'exists:vendors,id'],
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sku' => ['required', 'string', 'max:50'],
            'items.*.part_name' => ['required', 'string', 'max:150'],
            'items.*.vendor_barcode' => ['required', 'string', 'max:90'],
            'items.*.expected_qty' => ['required', 'integer', 'min:1'],
        ];
    }
    public function messages(): array
    {
        return [
            'do_number.unique' => 'Nomor DO sudah ada.',
            'items.min' => 'Minimal harus ada 1 item manifest.',
        ];
    }
}
