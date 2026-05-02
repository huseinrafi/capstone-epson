<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Evidence extends Model
{
    use HasUuids;

    protected $table = 'evidences';

    protected $fillable = [
        'anomaly_id',
        'uploader_id',
        'file_path',
        'file_url',
        'file_hash',
        'mime_type',
        'file_size_bytes',
        'taken_at',
        'latitude',
        'longitude',
        'device_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'file_size_bytes' => 'integer',
            'taken_at' => 'datetime',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }

    public function anomaly(): BelongsTo
    {
        return $this->belongsTo(Anomaly::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }
}
