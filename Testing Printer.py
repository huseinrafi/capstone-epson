import usb.core
import usb.util
from escpos.printer import Usb

VENDOR  = 0x0483
PRODUCT = 0x5840

# 1. Cari device
dev = usb.core.find(idVendor=VENDOR, idProduct=PRODUCT)
if dev is None:
    raise RuntimeError("Printer tidak terdeteksi. Pastikan USB terhubung.")

# 2. Auto-detect Endpoint & Detach Kernel Driver
out_ep = None
in_ep  = None

for cfg in dev:
    for intf in cfg:
        # Lepas usblp jika masih menempel
        if dev.is_kernel_driver_active(intf.bInterfaceNumber):
            dev.detach_kernel_driver(intf.bInterfaceNumber)
        
        dev.set_configuration()
        
        for ep in intf:
            addr = ep.bEndpointAddress
            if usb.util.endpoint_direction(addr) == usb.util.ENDPOINT_OUT:
                out_ep = addr
            elif usb.util.endpoint_direction(addr) == usb.util.ENDPOINT_IN:
                in_ep = addr

if out_ep is None:
    raise RuntimeError("Tidak ditemukan endpoint OUT pada printer ini.")

# Perbaikan f-string yang error
in_ep_str = f"0x{in_ep:02x}" if in_ep is not None else "N/A"
print(f"✅ Endpoint terdeteksi -> OUT: 0x{out_ep:02x} | IN: {in_ep_str}")

# 3. Inisialisasi & Cetak
try:
    printer = Usb(VENDOR, PRODUCT, out_ep=out_ep, in_ep=in_ep, interface=0, timeout=5000)
    
    printer.text("=== TEST PRINTER IWARE MP-58SB ===\n")
    printer.text(f"Endpoint OUT: 0x{out_ep:02x}\n")
    printer.text("Status: ENDPOINT FIX BERHASIL!\n")
    printer.cut()
    printer.close()
    print("🖨️ Cetak berhasil tanpa error!")
    
except Exception as e:
    print(f"❌ Gagal: {e}")