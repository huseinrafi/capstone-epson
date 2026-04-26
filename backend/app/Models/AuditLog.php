<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id', 'action', 'reference_id', 'reference_type', 
        'old_value', 'new_value', 'notes', 'ip_address'
    ];

    // Cast kolom JSONB agar Laravel otomatis mengubahnya menjadi array/object
    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function reference() { return $this->morphTo(); }
}