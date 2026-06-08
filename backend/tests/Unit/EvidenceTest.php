<?php

namespace Tests\Unit;

use App\Models\Evidence;
use Illuminate\Http\Request;
use Tests\TestCase;

class EvidenceTest extends TestCase
{
    public function test_file_url_uses_current_request_host(): void
    {
        $this->app['request'] = Request::create('http://127.0.0.1:8000/api/v1/dashboard/anomalies/drilldown');

        $evidence = new Evidence([
            'file_path' => 'anomaly-evidences/anomaly-id/photo.jpg',
            'file_url' => 'http://localhost/storage/anomaly-evidences/anomaly-id/photo.jpg',
        ]);

        $this->assertSame(
            'http://127.0.0.1:8000/storage/anomaly-evidences/anomaly-id/photo.jpg',
            $evidence->file_url
        );
    }
}
