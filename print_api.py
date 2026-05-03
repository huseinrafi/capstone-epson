from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from pathlib import Path
import usb.core
import usb.util
from escpos.printer import Usb

app = Flask(__name__)
CORS(app)

VENDOR  = 0x0483
PRODUCT = 0x5840

def get_env_value(key):
    value = os.getenv(key)
    if value:
        return value

    env_path = Path(__file__).resolve().parent / "backend" / ".env"
    if not env_path.exists():
        return None

    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        name, raw_value = line.split("=", 1)
        if name == key:
            return raw_value.strip().strip('"').strip("'") or None

    return None

PRINT_TOKEN = get_env_value("PRINT_SERVICE_TOKEN")

def authorize(req):
    if not PRINT_TOKEN:
        return True

    return req.headers.get("X-Print-Service-Token") == PRINT_TOKEN

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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"success": True, "message": "Print service ready"})

@app.route('/api/print', methods=['POST'])
def print_barcode():
    if not authorize(request):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    barcode_text = str(data.get('barcode', '')).strip()
    sku = str(data.get('sku', '')).strip()
    part_name = str(data.get('part_name', '')).strip()
    do_number = str(data.get('do_number', '')).strip()

    if not barcode_text:
        return jsonify({"success": False, "error": "No barcode provided"}), 400

    try:
        printer = get_printer()
        
        printer.set(align='center', bold=True)
        printer.text("EPSON INTERNAL\n")
        printer.text("LABEL BARCODE\n\n")
        
        barcode_clean = str(barcode_text).strip()
        
        try:
            if barcode_clean.isdigit() and len(barcode_clean) in [12, 13]:
                if len(barcode_clean) == 12:
                    barcode_clean = barcode_clean.zfill(13)
                printer.barcode(barcode_clean, 'EAN13', width=2, height=64, pos='BELOW')
            else:
                printer.barcode(barcode_clean.upper(), 'CODE39', width=2, height=64, pos='BELOW')
                
        except Exception as bc_err:
            try:
                printer.barcode(barcode_clean, 'CODE128', width=2, height=64, pos='BELOW', force_software=True)
            except Exception as soft_err:
                printer.text(f"Barcode:\n{barcode_clean}\n")
                print(f"Barcode format fallback failed: {soft_err}")

        printer.text("\n")
        printer.set(align='left', bold=False)
        printer.text(f"ID  : {barcode_text}\n")
        printer.text(f"SKU : {sku or '-'}\n")
        printer.text(f"PART: {part_name or '-'}\n")
        printer.text(f"DO  : {do_number or '-'}\n")

        printer.text("\n")
        printer.cut()
        printer.close()

        return jsonify({"success": True, "message": "Label berhasil dicetak"})
    except Exception as e:
        print(f"Print error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("Mulai Print API Server di Port 5001...")
    # Pakai host 0.0.0.0 agar bisa diakses dari mana saja kalau perlu
    app.run(host='0.0.0.0', port=5001, debug=True)
