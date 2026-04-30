<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'delivery_order_id',
        'sku',
        'part_name',
        'vendor_barcode',
        'expected_qty',
        'scanned_qty',
        'final_status',
    ];

    protected function casts(): array
    {
        return [
            'expected_qty' => 'integer',
            'scanned_qty' => 'integer',
        ];
    }

    public function deliveryOrder(): BelongsTo
    {
        return $this->belongsTo(DeliveryOrder::class);
    }
}
