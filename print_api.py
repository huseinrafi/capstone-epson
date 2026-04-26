from flask import Flask, request, jsonify
from flask_cors import CORS
import usb.core
import usb.util
from escpos.printer import Usb

app = Flask(__name__)
CORS(app)

VENDOR  = 0x0483
PRODUCT = 0x5840

def get_printer():
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

    # 3. Inisialisasi
    printer = Usb(VENDOR, PRODUCT, out_ep=out_ep, in_ep=in_ep, interface=0, timeout=5000)
    return printer

@app.route('/api/print', methods=['POST'])
def print_barcode():
    data = request.json
    if not data or 'barcode' not in data:
        return jsonify({"error": "No barcode provided"}), 400

    barcode_text = data['barcode']
    name = data.get('name', 'Barang Print')

    try:
        printer = get_printer()
        
        # Center align testing
        printer.set(align='center', bold=True)
        printer.text("=== CAPSTONE EPSON ===\n")
        printer.text(f"Nama: {name}\n\n")
        
        # Smart Barcode Fallback Method
        barcode_clean = str(barcode_text).strip()
        
        try:
            # Jika user menginput 12 atau 13 angka yang valid, coba cetak sebagai EAN13
            if barcode_clean.isdigit() and len(barcode_clean) in [12, 13]:
                # Pad into 13 digits if 12
                if len(barcode_clean) == 12:
                    barcode_clean = barcode_clean.zfill(13)
                printer.barcode(barcode_clean, 'EAN13', width=2, height=64, pos='BELOW')
            else:
                # Jika karakter campuran/bebas, gunakan CODE39 yang didukung hampir semua mesin POS
                # CODE39 mewajibkan huruf besar (Uppercase)
                printer.barcode(barcode_clean.upper(), 'CODE39', width=2, height=64, pos='BELOW')
                
        except Exception as bc_err:
            try:
                # Opsi terakhir: cetak sebagai gambar (software rendered) untuk memastikan pasti kecetak apapun kodenya
                printer.barcode(barcode_clean, 'CODE128', width=2, height=64, pos='BELOW', force_software=True)
            except Exception as soft_err:
                printer.text(f"Barcode:\n{barcode_clean}\n")
                print(f"Barcode format fallback failed: {soft_err}")

        printer.text("\n\n")
        printer.text("Terima kasih!\n")
        printer.cut()
        printer.close()

        return jsonify({"success": True, "message": "Berhasil dicetak!"})
    except Exception as e:
        print(f"Print error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Mulai Print API Server di Port 5001 (HTTPS Enabled)...")
    # Pakai host 0.0.0.0 agar bisa diakses dari mana saja kalau perlu
    # Menggunakan SSL agar dapat menerima request dari frontend HP yang jalan di HTTPS
    app.run(host='0.0.0.0', port=5001, debug=True, ssl_context=('cert.pem', 'key.pem'))
