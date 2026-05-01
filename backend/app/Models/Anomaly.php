<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Anomaly extends Model
{
    use HasUuids;

    public const TYPE_INBOUND_DISCREPANCY = 'INBOUND_DISCREPANCY';
    public const STATUS_PENDING_REVIEW = 'PENDING_REVIEW';

    protected $fillable = [
        'anomaly_type',
        'reference_type',
        'reference_id',
        'discrepancy_type',
        'affected_sku',
        'expected_qty',
        'actual_qty',
        'status',
        'reported_by',
        'reviewed_by',
        'review_notes',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }


    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }
}
