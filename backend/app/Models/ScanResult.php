<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScanResult extends Model
{
    use HasUuids;

    public const STATUS_MATCH = 'MATCH';
    public const STATUS_MISMATCH = 'MISMATCH';
    public const STATUS_OVER = 'OVER';
    public const STATUS_NOT_FOUND = 'NOT_FOUND';

    public $timestamps = false;

    protected $fillable = [
        'delivery_order_id',
        'do_item_id',
        'operator_id',
        'scanned_barcode',
        'result_status',
        'scanned_at',
        'device_id',
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

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }
}
