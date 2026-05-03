<?php

namespace App\Jobs;

use App\Models\InternalItem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PrintInternalLabelJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 10;

    public function __construct(public string $internalItemId)
    {
    }

    public function handle(): void
    {
        $internalItem = InternalItem::query()
            ->with('deliveryOrder')
            ->findOrFail($this->internalItemId);

        $response = Http::timeout(5)
            ->acceptJson()
            ->withHeaders($this->headers())
            ->post(config('services.print.url'), [
                'barcode' => $internalItem->internal_barcode,
                'sku' => $internalItem->sku,
                'part_name' => $internalItem->part_name,
                'do_number' => $internalItem->deliveryOrder?->do_number,
            ]);

        if ($response->failed()) {
            Log::warning('Internal label print failed.', [
                'internal_item_id' => $internalItem->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $response->throw();
        }
    }

    private function headers(): array
    {
        $token = config('services.print.token');

        return $token ? ['X-Print-Service-Token' => $token] : [];
    }
}
