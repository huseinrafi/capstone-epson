<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class TransitItem extends Model
{
    use HasUuid;

    protected $fillable = [
        'transit_id', 'internal_item_id', 'scan_out_by', 
        'scan_in_by', 'scanned_out_at', 'scanned_in_at', 'transit_status'
    ];

    public function transit() { return $this->belongsTo(Transit::class); }
    public function internalItem() { return $this->belongsTo(InternalItem::class); }
    public function scannerOut() { return $this->belongsTo(User::class, 'scan_out_by'); }
    public function scannerIn() { return $this->belongsTo(User::class, 'scan_in_by'); }
}