<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Anomaly extends Model
{
    use HasUuids;

    public const TYPE_INBOUND_DISCREPANCY = 'INBOUND_DISCREPANCY';
    public const TYPE_TRANSIT_DISCREPANCY = 'TRANSIT_DISCREPANCY';

    public const STATUS_PENDING_REVIEW = 'PENDING_REVIEW';

    public const STATUS_APPROVED = 'APPROVED';

    public const STATUS_HOLD = 'HOLD';

    public const STATUS_RETURNED = 'RETURNED';

    public const STATUS_RECOUNT = 'RECOUNT';

    public const DISCREPANCY_MISSING = 'MISSING';

    public const DISCREPANCY_OVER = 'OVER';

    public const DISCREPANCY_UNEXPECTED = 'UNEXPECTED';

    public const DISCREPANCY_MISMATCH = 'MISMATCH';

    protected $fillable = [
        'anomaly_type',
        'reference_type',
        'reference_id',
        'scan_result_id',
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

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scanResult(): BelongsTo
    {
        return $this->belongsTo(ScanResult::class);
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(Evidence::class);
    }
}
