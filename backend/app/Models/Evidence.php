<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Evidence extends Model
{
    use HasUuid;

    protected $fillable = [
        'anomaly_id', 'uploader_id', 'file_path', 'file_url', 
        'taken_at', 'latitude', 'longitude', 'notes'
    ];

    protected $casts = [
        'taken_at' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function anomaly() { return $this->belongsTo(Anomaly::class); }
    public function uploader() { return $this->belongsTo(User::class, 'uploader_id'); }
}