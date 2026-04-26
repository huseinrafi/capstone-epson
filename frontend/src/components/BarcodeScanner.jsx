import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function BarcodeScanner() {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const navigate = useNavigate();
    
    // Simpan instance qrcode
    const html5QrCode = useRef(null);

    useEffect(() => {
        let isComponentUnmounted = false;
        
        // Timeout untuk menghindari React 18 StrictMode double-mounting collision di hardware API
        const initCamera = setTimeout(() => {
            if (isComponentUnmounted) return;

            html5QrCode.current = new Html5Qrcode("reader");
            
            html5QrCode.current.start(
                { facingMode: "environment" }, // Kamera belakang
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                    // Ketika scan sukses
                    setScanResult(decodedText);
                    
                    // Pause/stop kamera setelah berhasil scan
                    if (html5QrCode.current && html5QrCode.current.isScanning) {
                        html5QrCode.current.stop().catch(console.error);
                    }
                },
                (errorMessage) => {
                    // ignore normal frame scan errors (e.g. no barcode found in frame yet)
                }
            ).catch(err => {
                if(!isComponentUnmounted) {
                    setError('Gagal mengakses kamera. Pastikan memberikan izin.');
                }
            });
        }, 500); // Jeda 500ms

        return () => {
            isComponentUnmounted = true;
            clearTimeout(initCamera);
            if (html5QrCode.current && html5QrCode.current.isScanning) {
                html5QrCode.current.stop().catch(err => console.error("Error stopping camera", err));
            }
        };
    }, []);

    const handlePrint = async () => {
        if (!scanResult) return;
        setIsPrinting(true);
        try {
            const res = await axios.post('http://localhost:5001/api/print', { 
                barcode: scanResult,
                name: "Scanned Item" 
            });
            if(res.data.success) {
                alert('✔ Berhasil dicetak ulang ke Thermal Printer!');
            } else {
                alert('Silahkan cek printer. ' + (res.data.error || ''));
            }
        } catch (error) {
            alert('Gagal tersambung ke Server Print API.');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleRescan = () => {
        window.location.reload();
    };

    return (
        <div className="glass-panel">
            <div>
                <h1>Kamera Scanner</h1>
                <p className="subtitle">Arahkan kamera ke Barcode</p>
            </div>

            {/* Div reader sengaja tidak di-unmount agar instance Html5Qrcode tidak crash */}
            <div 
                className="scanner-container" 
                style={{ 
                    display: (scanResult || error) ? 'none' : 'block',
                    minHeight: '200px',
                    width: '100%'
                }}
            >
                <div id="reader" style={{ width: '100%', border: 'none' }}></div>
            </div>

            {scanResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div className="status-badge status-success">
                        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Hasil Scan Match</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{scanResult}</div>
                    </div>
                    
                    <button onClick={handlePrint} className="btn btn-primary" disabled={isPrinting}>
                        {isPrinting ? 'Mencetak...' : '🖨️ Print Ulang Hasil'}
                    </button>
                    
                    <button onClick={handleRescan} className="btn btn-secondary">
                        📷 Scan Lagi
                    </button>
                </div>
            )}

            {error && (
                <div className="status-badge status-error">
                    <h3>❌ Akses Ditolak</h3>
                    <p style={{fontSize: '0.9rem', marginTop: '0.5rem'}}>{error}</p>
                    <button onClick={handleRescan} className="btn btn-accent" style={{marginTop: '1rem'}}>
                        Coba Lagi
                    </button>
                </div>
            )}

            <div className="nav-links">
                <a onClick={() => navigate('/')} className="nav-link" style={{cursor:'pointer'}}>
                    ← Kembali ke Generator
                </a>
            </div>
        </div>
    );
}

export default BarcodeScanner;