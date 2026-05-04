<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class DashboardAnalyticsRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'vendor_id' => ['nullable', 'uuid', 'exists:vendors,id'],
            'sku' => ['nullable', 'string', 'max:50'],
            'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
            'group_by' => ['nullable', Rule::in(['day', 'week', 'month'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
