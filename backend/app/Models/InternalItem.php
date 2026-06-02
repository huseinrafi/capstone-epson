<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InternalItem extends Model
{
    use HasUuids;

    public const STATUS_AVAILABLE = 'AVAILABLE';
    public const STATUS_IN_TRANSIT = 'IN_TRANSIT';
    public const STATUS_USED = 'USED';
    public const STATUS_DISPOSED = 'DISPOSED';

    protected $fillable = [
        'internal_barcode',
        'do_item_id',
        'delivery_order_id',
        'current_warehouse_id',
        'received_by',
        'sku',
        'part_name',
        'status',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
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

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function currentWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'current_warehouse_id');
    }

    public function transitItems(): HasMany
    {
        return $this->hasMany(TransitItem::class);
    }
}
