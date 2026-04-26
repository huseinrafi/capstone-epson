<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryOrder extends Model
{
    use HasUuid, SoftDeletes;

    protected $fillable = [
        'do_number', 'vendor_id', 'warehouse_id', 'admin_user_id', 
        'status', 'expected_total', 'scanned_total', 'notes', 
        'started_at', 'completed_at'
    ];

    public function vendor() { return $this->belongsTo(Vendor::class); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
    public function admin() { return $this->belongsTo(User::class, 'admin_user_id'); }
    public function items() { return $this->hasMany(DoItem::class); }
    public function anomalies() { return $this->morphMany(Anomaly::class, 'reference'); }
}