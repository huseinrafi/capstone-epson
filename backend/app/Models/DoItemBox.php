<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoItemBox extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_SCANNED = 'SCANNED';
    public const STATUS_MISSING = 'MISSING';

    protected $fillable = [
        'delivery_order_id',
        'do_item_id',
        'barcode',
        'status',
        'scanned_at',
    ];

    protected function casts(): array
    {
        return [
            'scanned_at' => 'datetime',
        ];
    }

    public function deliveryOrder(): BelongsTo
    {
        return $this->belongsTo(DeliveryOrder::class);
    }

    public function doItem(): BelongsTo
    {
        return $this->belongsTo(DoItem::class);
    }
}
