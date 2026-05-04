<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transit extends Model
{
    use HasUuids;

    public const STATUS_TRANSIT_INIT = 'TRANSIT_INIT';
    public const STATUS_IN_TRANSIT = 'IN_TRANSIT';
    public const STATUS_TRANSIT_COMPLETED = 'TRANSIT_COMPLETED';
    public const STATUS_INVESTIGATION_REQUIRED = 'INVESTIGATION_REQUIRED';


    protected $fillable = [
        'transit_number',
        'origin_warehouse_id',
        'dest_warehouse_id',
        'created_by',
        'status',
        'expected_total',
        'sent_total',
        'received_total',
        'departed_at',
        'arrived_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_total' => 'integer',
            'sent_total' => 'integer',
            'received_total' => 'integer',
            'departed_at' => 'datetime',
            'arrived_at' => 'datetime',
        ];
    }

    public function originWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'origin_warehouse_id');
    }

    public function destinationWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'dest_warehouse_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransitItem::class);
    }

    public function anomalies(): HasMany
    {
        return $this->hasMany(Anomaly::class, 'reference_id')->where('reference_type', self::class);
    }

}
