<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    use HasUuid;

    protected $fillable = [
        'code',
        'name',
        'location',
    ];

    public function deliveryOrders()
    {
        return $this->hasMany(DeliveryOrder::class);
    }
}