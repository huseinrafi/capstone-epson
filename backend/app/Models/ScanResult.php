<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class ScanResult extends Model
{
    use HasUuid;

    // Matikan timestamps bawaan karena kita hanya pakai scanned_at
    public $timestamps = false;

    protected $fillable = [
        'delivery_order_id', 'do_item_id', 'operator_id', 
        'scanned_barcode', 'result_status', 'scanned_at', 'device_id'
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function deliveryOrder() { return $this->belongsTo(DeliveryOrder::class); }
    public function doItem() { return $this->belongsTo(DoItem::class); }
    public function operator() { return $this->belongsTo(User::class, 'operator_id'); }
}