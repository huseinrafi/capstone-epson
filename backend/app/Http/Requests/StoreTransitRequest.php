<?php

namespace App\Http\Requests;

class StoreTransitRequest extends ApiFormRequest
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
            'transit_number' => ['required', 'string', 'max:30', 'unique:transits,transit_number'],
            'origin_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id', 'different:dest_warehouse_id'],
            'dest_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'internal_item_ids' => ['required', 'array', 'min:1'],
            'internal_item_ids.*' => ['required', 'uuid', 'distinct', 'exists:internal_items,id'],
        ];
    }
}
