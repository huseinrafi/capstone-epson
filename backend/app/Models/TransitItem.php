<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransitItem extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'PENDING';
    public const STATUS_SCANNED_OUT = 'SCANNED_OUT';
    public const STATUS_SCANNED_IN = 'SCANNED_IN';
    public const STATUS_MISSING = 'MISSING';
    public const STATUS_OVER = 'OVER';

    protected $fillable = [
        'transit_id',
        'internal_item_id',
        'scan_out_by',
        'scan_in_by',
        'scanned_out_at',
        'scanned_in_at',
        'transit_status',
    ];

    protected function casts(): array
    {
        return [
            'scanned_out_at' => 'datetime',
            'scanned_in_at' => 'datetime',
        ];
    }

    public function transit(): BelongsTo
    {
        return $this->belongsTo(Transit::class);
    }
    public function internalItem(): BelongsTo
    {
        return $this->belongsTo(InternalItem::class);
    }
    public function scanOutOperator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scan_out_by');
    }
    public function scanInOperator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scan_in_by');
    }
}
