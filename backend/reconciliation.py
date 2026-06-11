# import psycopg2
# from psycopg2.extras import RealDictCursor
# from datetime import datetime

# # --- KONFIGURASI KONEKSI DATABASE ---
# DB_HOST = "127.0.0.1"
# DB_PORT = "5432"
# DB_DATABASE = "epson_capstone_db"
# DB_USERNAME = "postgres"
# DB_PASSWORD = "kongkalikong"

# def get_db_connection():
#     """Fungsi untuk membuka pintu ke PostgreSQL"""
#     try:
#         return psycopg2.connect(
#             host=DB_HOST,
#             port=DB_PORT,
#             database=DB_DATABASE,
#             user=DB_USERNAME,
#             password=DB_PASSWORD
#         )
#     except Exception as e:
#         print(f"Gagal terhubung ke database: {e}")
#         return None

# def process_scan(manifest_id, scanned_barcode, operator_id):
#     """
#     MODUL 4: ALGORITMA REKONSILIASI UTAMA
#     Menerima input dari scanner dan mencocokkan dengan data manifes (DO)
#     """
#     conn = get_db_connection()
#     if not conn:
#         return {"status": "ERROR", "message": "Database terputus!"}
        
#     cur = conn.cursor(cursor_factory=RealDictCursor)
    
#     try:
#         # 1. Cari barcode di tabel do_items untuk manifes DO yang aktif
#         cur.execute("""
#             SELECT id, sku, part_name, expected_qty, scanned_qty 
#             FROM do_items 
#             WHERE delivery_order_id = %s AND vendor_barcode = %s
#         """, (manifest_id, scanned_barcode))
        
#         item = cur.fetchone()

#         # --- VALIDASI BERLAPIS (Sesuai PRD Halaman 12) ---
        
#         # A. Validasi Keberadaan (NOT FOUND / MISMATCH)
#         if not item:
#             print(f"[LAYAR MERAH] Barcode {scanned_barcode} tidak terdaftar di DO ini!")
#             # Trigger Modul 5 (Ubah status DO jadi HOLD_INBOUND)
#             cur.execute("UPDATE delivery_orders SET status = 'HOLD_INBOUND' WHERE id = %s", (manifest_id,))
#             conn.commit()
#             return {"status": "MISMATCH", "message": "Barang nyasar atau salah vendor!"}

#         # B. Validasi Kuantitas (OVER)
#         if item['scanned_qty'] >= item['expected_qty']:
#             print(f"[LAYAR MERAH] Barcode {scanned_barcode} melebihi target ({item['expected_qty']} unit)!")
#             # Trigger Modul 5
#             cur.execute("UPDATE delivery_orders SET status = 'HOLD_INBOUND' WHERE id = %s", (manifest_id,))
#             conn.commit()
#             return {"status": "OVER", "message": "Jumlah barang melebihi DO!"}

#         # C. Kondisi Normal (MATCH)
#         print(f"[LAYAR HIJAU] MATCH! Part: {item['part_name']} (SKU: {item['sku']})")
        
#         # Tambah hitungan di tabel do_items
#         cur.execute("UPDATE do_items SET scanned_qty = scanned_qty + 1 WHERE id = %s", (item['id'],))
        
#         # Catat riwayat scan ke tabel scan_results
#         cur.execute("""
#             INSERT INTO scan_results (delivery_order_id, do_item_id, operator_id, scanned_barcode, result_status, scanned_at)
#             VALUES (%s, %s, %s, %s, 'MATCH', %s)
#         """, (manifest_id, item['id'], operator_id, scanned_barcode, datetime.now()))
        
#         # (Opsional) Di sini bisa disisipkan kode untuk Modul 6: Generate Label Internal
        
#         conn.commit()
#         return {"status": "MATCH", "message": "Verifikasi sukses. Silakan scan barang berikutnya."}

#     except Exception as e:
#         conn.rollback() # Batalkan semua perubahan jika ada error
#         print(f"Terjadi kesalahan sistem: {e}")
#         return {"status": "ERROR", "message": "Gagal memproses data."}
#     finally:
#         cur.close()
#         conn.close()

# # --- BLOK TESTING LOKAL ---
# if __name__ == "__main__":
#     print("=== SISTEM VERIFIKASI EPSON ===")
#     print("Menunggu hasil scan...\n")
    
#     # Hapus tanda pagar (#) di bawah ini untuk mengetes jika tabel databasenya sudah ada isinya
#     # hasil = process_scan(manifest_id=1, scanned_barcode='1234567890', operator_id=99)
#     # print(hasil)