import usb.core
import usb.util
from escpos.printer import Usb

VENDOR  = 0x0483
PRODUCT = 0x5840

# 1. Deteksi device & endpoint
dev = usb.core.find(idVendor=VENDOR, idProduct=PRODUCT)
if dev is None:
    raise RuntimeError("Printer tidak terdeteksi. Pastikan USB terhubung.")

out_ep = in_ep = None
for cfg in dev:
    for intf in cfg:
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
    raise RuntimeError("Endpoint OUT tidak ditemukan.")

# 2. Cetak
try:
    printer = Usb(VENDOR, PRODUCT, out_ep=out_ep, in_ep=in_ep, interface=0, timeout=5000)
    
    # 📐 ALIGN CENTER (Raw ESC/POS)
    printer._raw(b'\x1B\x61\x01')
    printer.text("=== TEST BARCODE & QR ===\n")
    printer.text("IWARE MP-58SB\n")
    
    # 📜 FEED 1
    printer._raw(b'\x1B\x64\x01')

    # 📦 BARCODE
    # Gunakan 'height' & 'width' (bukan h/w)
    # Hapus align_ct karena sudah dihandle oleh raw ESC di atas
    printer.barcode("239472547890", "EAN13", height=64, width=2)
    
    # 📜 FEED 2
    printer._raw(b'\x1B\x64\x02')

    # 📱 QR CODE
    printer._raw(b'\x1B\x61\x01')
    printer.text("Scan QR Code:\n")
    # Parameter standar: text, size, ec (error correction)
    printer.qr("https://github.com/python-escpos/python-escpos", size=4, ec="M")
    
    # 📜 FEED 3
    printer._raw(b'\x1B\x64\x03')

    # ✂️ CUT PAPER
    printer._raw(b'\x1D\x56\x41\x00')
    
    printer.close()
    print("✅ Cetak barcode & QR berhasil!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    # Debug info jika masih error
    import inspect
    sig = inspect.signature(printer.barcode)
    print(f"💡 Signature barcode() di versi Anda: {sig}")