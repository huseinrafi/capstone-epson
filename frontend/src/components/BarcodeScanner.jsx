import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

function BarcodeScanner() {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const qrcode = new Html5Qrcode("reader");

        const onScanSuccess = async (decodedText) => {
            try {
                const res = await axios.get(`http://localhost:8000/api/items/${decodedText}`);
                setScanResult(res.data.data);
                qrcode.stop();
            } catch (err) {
                setError('Barcode tidak ditemukan dalam database');
            }
        };

        qrcode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            onScanSuccess
        ).catch(err => {
            setError('Gagal mengakses kamera: ' + err);
        });

        return () => {
            qrcode.stop().catch(() => { });
        };
    }, []);

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Scanner Barcode</h1>
            <div id="reader" style={{ width: '300px', margin: '0 auto' }}></div>

            {scanResult && (
                <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#d4edda', borderRadius: '5px' }}>
                    <h3>✅ MATCH</h3>
                    <p>Barcode: {scanResult.barcode}</p>
                    <p>Nama: {scanResult.name}</p>
                    <p>Status: {scanResult.status}</p>
                </div>
            )}

            {error && (
                <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8d7da', borderRadius: '5px' }}>
                    <h3>❌ {error}</h3>
                </div>
            )}

            <a href="/" style={{ display: 'block', marginTop: '20px' }}>
                ← Kembali ke Generator
            </a>
        </div>
    );
}

export default BarcodeScanner;