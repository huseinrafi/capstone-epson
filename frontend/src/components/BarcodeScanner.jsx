import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function BarcodeScanner() {
    const [scanResult, setScanResult] = useState(null); // the raw scan text
    const [svsbStatus, setSvsbStatus] = useState(null); // MATCH, MISMATCH, OVER, NOT_FOUND
    const [svsbMessage, setSvsbMessage] = useState(null); 
    const [internalBarcode, setInternalBarcode] = useState(null); 
    
    const [doId, setDoId] = useState(1); // Default to Dummy DO ID
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    
    const navigate = useNavigate();
    const html5QrCode = useRef(null);

    useEffect(() => {
        let isComponentUnmounted = false;
        
        const initCamera = setTimeout(() => {
            if (isComponentUnmounted) return;

            html5QrCode.current = new Html5Qrcode("reader");
            
            html5QrCode.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                    handleBarcodeScanned(decodedText);
                    
                    if (html5QrCode.current && html5QrCode.current.isScanning) {
                        html5QrCode.current.stop().catch(console.error);
                    }
                },
                (errorMessage) => {}
            ).catch(err => {
                if(!isComponentUnmounted) setError('Gagal mengakses kamera. Pastikan memberikan izin.');
            });
        }, 500); 

        return () => {
            isComponentUnmounted = true;
            clearTimeout(initCamera);
            if (html5QrCode.current && html5QrCode.current.isScanning) {
                html5QrCode.current.stop().catch(err => console.error("Error stopping camera", err));
            }
        };
    }, [doId]); // Restart camera isn't strictly necessary when doId changes, but kept simple.

    const handleBarcodeScanned = async (decodedText) => {
        setScanResult(decodedText);
        setIsProcessing(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/scan/inbound', {
                barcode: decodedText,
                delivery_order_id: doId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSvsbStatus(res.data.status);
            setSvsbMessage(res.data.message);
            if (res.data.internal_barcode) {
                setInternalBarcode(res.data.internal_barcode);
            }
        } catch (err) {
            console.error(err);
            setSvsbStatus('ERROR');
            setSvsbMessage(err.response?.data?.error || 'Gagal menghubungi server Node.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrint = async () => {
        if (!internalBarcode) return;
        setIsPrinting(true);
        try {
            // Print API endpoint (masih menggunakan Python Flask Server di Port 5001)
            const apiUrl = window.location.protocol + '//' + window.location.hostname + ':5001/api/print';
            const res = await axios.post(apiUrl, { 
                barcode: internalBarcode,
                name: "SVSB INTERNAL" 
            });
            if(res.data.success) {
                alert('✔ Label Internal SVSB berhasil dicetak ke Thermal Printer!');
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
                <h1>Inbound Scanner</h1>
                <p className="subtitle">Sistem SVSB Otomatis</p>
            </div>

            <div style={{marginBottom: '1rem', textAlign:'left'}}>
                <label className="input-label">Delivery Order ID Aktif</label>
                <input 
                    type="number" 
                    className="modern-input" 
                    value={doId} 
                    onChange={e => setDoId(e.target.value)} 
                    disabled={scanResult !== null}
                />
            </div>

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

            {isProcessing && <p style={{color:'var(--primary)'}}>Memvalidasi ke Sistem SVSB...</p>}

            {scanResult && !isProcessing && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    
                    {/* UI Kondisional berdasarkan Status SVSB */}
                    {svsbStatus === 'MATCH' ? (
                        <div className="status-badge status-success">
                            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Item Terverifikasi!</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#00ffaa' }}>{scanResult}</div>
                            <hr style={{opacity:0.2, margin:'0.5rem 0'}}/>
                            <div style={{fontSize:'0.9rem'}}>Internal Barcode Terbit:</div>
                            <div style={{fontSize:'1.3rem', letterSpacing:'1px', marginTop:'0.2rem'}}>{internalBarcode}</div>
                        </div>
                    ) : (
                        <div className="status-badge status-error">
                            <h3 style={{color:'#ff4444'}}>❌ ANOMALI: {svsbStatus}</h3>
                            <p style={{fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9}}>{svsbMessage}</p>
                            <div style={{fontSize:'0.8rem', marginTop:'0.5rem', fontStyle:'italic'}}>Barcode Tercatat: {scanResult}</div>
                            
                            <button className="btn btn-primary" style={{marginTop:'1rem'}} disabled>
                                📸 Upload Evidence (Foto Anomali)
                            </button>
                        </div>
                    )}
                    
                    {svsbStatus === 'MATCH' && (
                        <button onClick={handlePrint} className="btn btn-primary" disabled={isPrinting}>
                            {isPrinting ? 'Mencetak ke Epson...' : '🖨️ Cetak Label Internal (EPS-XXXXX)'}
                        </button>
                    )}
                    
                    <button onClick={handleRescan} className="btn btn-secondary">
                        📦 Lanjut Scan Item Berikutnya
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
                <a onClick={() => navigate('/dashboard')} className="nav-link" style={{cursor:'pointer'}}>
                    ← Kembali ke Dashboard Utama
                </a>
            </div>
        </div>
    );
}

export default BarcodeScanner;