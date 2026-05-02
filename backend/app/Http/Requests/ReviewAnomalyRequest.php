<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class ReviewAnomalyRequest extends ApiFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['APPROVE', 'HOLD', 'RETURN', 'RECOUNT'])],
            'notes' => ['nullable', 'string'],
        ];
    }
}
