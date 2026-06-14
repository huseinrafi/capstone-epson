<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use App\Models\ScanResult;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryOrder extends Model
{
    use HasUuids, SoftDeletes;

    public const STATUS_PENDING = 'PENDING';

    public const STATUS_IN_PROGRESS = 'IN_PROGRESS';

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_HOLD_INBOUND = 'HOLD_INBOUND';

    public const STATUS_RETURNED = 'RETURNED';

    protected $fillable = [
        'do_number',
        'vendor_id',
        'warehouse_id',
        'admin_user_id',
        'status',
        'expected_total',
        'scanned_total',
        'notes',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'expected_total' => 'integer',
            'scanned_total' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DoItem::class);
    }

    public function boxes(): HasMany
    {
        return $this->hasMany(DoItemBox::class);
    }

    public function scanResults(): HasMany
    {
        return $this->hasMany(ScanResult::class);
    }

    public function anomalies(): HasMany
    {
        return $this->hasMany(Anomaly::class, 'reference_id')
            ->where('reference_type', self::class);
    }

    /**
     * Internal items yang terdaftar setelah proses inbound selesai.
     */
    public function internalItems(): HasMany
    {
        return $this->hasMany(InternalItem::class);
    }

    /**
     * Transit items milik internal items dari manifest ini.
     * Digunakan untuk melacak riwayat perpindahan barang antar gudang.
     */
    public function transitItems(): HasManyThrough
    {
        return $this->hasManyThrough(
            TransitItem::class,
            InternalItem::class,
            'delivery_order_id', // FK pada InternalItem → DeliveryOrder
            'internal_item_id',  // FK pada TransitItem → InternalItem
            'id',                // PK DeliveryOrder
            'id'                 // PK InternalItem
        );
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }
}