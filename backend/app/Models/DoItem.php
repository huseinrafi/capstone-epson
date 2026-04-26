<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class DoItem extends Model
{
    use HasUuid;

    protected $fillable = [
        'delivery_order_id', 'sku', 'part_name', 
        'vendor_barcode', 'expected_qty', 'scanned_qty', 'final_status'
    ];
    public function deliveryOrder() { return $this->belongsTo(DeliveryOrder::class); }
}