<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Transit extends Model
{
    use HasUuid;

    protected $fillable = [
        'internal_barcode', 'do_item_id', 'delivery_order_id', 
        'current_warehouse_id', 'received_by', 'sku', 'part_name', 
        'status', 'received_at'
    ];

    public function doItem() { return $this->belongsTo(DoItem::class); }
    public function deliveryOrder() { return $this->belongsTo(DeliveryOrder::class); }
    public function currentWarehouse() { return $this->belongsTo(Warehouse::class, 'current_warehouse_id'); }
    public function receiver() { return $this->belongsTo(User::class, 'received_by'); }
}