<?php

namespace App\Http\Controllers;

use App\Models\DeliveryOrder;

class AdminController extends Controller
{
    /**
     * Tampilkan semua daftar DO berserta progress item-itemnya.
     */
    public function getDeliveryOrders()
    {
        $dos = DeliveryOrder::orderBy('created_at', 'desc')->get();
        
        // Kita juga bisa meload relasi items-nya secara manual (atau pakai Eloquent with)
        // Tetapi karena relasi belum terdefinisikan secara eksplisit di Model, kita query manual atau kita buatkan relasinya.
        $dos = DeliveryOrder::with('items')->orderBy('created_at', 'desc')->get();
        // Wait, DeliveryOrder model needs `items()` method. I will assume it doesn't have it and just map it.
        
        $dos->transform(function ($do) {
            $items = \App\Models\DOItem::where('delivery_order_id', $do->id)->get();
            $totalExpected = $items->sum('expected_qty');
            $totalScanned = $items->sum('scanned_qty');
            
            $do->total_expected = $totalExpected;
            $do->total_scanned = $totalScanned;
            $do->items = $items;
            
            return $do;
        });

        return response()->json($dos);
    }
}
