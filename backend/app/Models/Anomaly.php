<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Anomaly extends Model
{
    use HasUuid;

    protected $fillable = [
        'anomaly_type', 'reference_id', 'reference_type', 
        'discrepancy_type', 'affected_sku', 'expected_qty', 
        'actual_qty', 'status', 'reported_by', 'reviewed_by', 
        'review_notes', 'reviewed_at'
    ];

    public function reference() { return $this->morphTo(); }

    public function reporter() { return $this->belongsTo(User::class, 'reported_by'); }
    public function reviewer() { return $this->belongsTo(User::class, 'reviewed_by'); }
    
    public function evidences() { return $this->hasMany(Evidence::class); }
}