import { useState } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';
import { useNavigate } from 'react-router-dom';

function BarcodeGenerator() {
    const [name, setName] = useState('');
    const [barcodeData, setBarcodeData] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);
    const [status, setStatus] = useState(null);
    const navigate = useNavigate();

    const handleGenerate = (e) => {
        e.preventDefault();
        if(!name.trim()) {
            setStatus({ type: 'error', message: 'Silahkan isi produk/barcode' });
            return;
        }
        setBarcodeData(name);
        setStatus(null);
    };

    const handlePrint = async () => {
        if (!barcodeData) return;
        setIsPrinting(true);
        setStatus(null);
        
        try {
            const apiUrl = window.location.protocol + '//' + window.location.hostname + ':5001/api/print';
            const res = await axios.post(apiUrl, { 
                barcode: barcodeData,
                name: "Scanned Item" 
            });
            
            if(res.data.success) {
                setStatus({ type: 'success', message: '✔ Printer Berhasil Mencetak!' });
            } else {
                setStatus({ type: 'error', message: res.data.error || 'Gagal tersambung ke printer.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Server Print Offline atau Terjadi Kesalahan.' });
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="glass-panel">
            <div>
                <h1>Generator Barcode</h1>
                <p className="subtitle">Cetak barcode fisik dari Capstone Epson</p>
            </div>

            <form onSubmit={handleGenerate} className="input-group">
                <label className="input-label">Data Barcode</label>
                <input
                    type="text"
                    className="modern-input"
                    placeholder="Contoh: 12345678"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                />
                <button type="submit" className="btn btn-secondary" style={{marginTop: '0.5rem'}}>
                    Lihat Barcode
                </button>
            </form>

            {barcodeData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="barcode-preview">
                        <Barcode 
                            value={barcodeData} 
                            background="transparent" 
                            lineColor="#000000" 
                            width={2} 
                            height={60} 
                            displayValue={true}
                        />
                    </div>
                    
                    <button 
                        onClick={handlePrint} 
                        className="btn btn-primary"
                        disabled={isPrinting}
                    >
                        {isPrinting ? (
                            <><div className="spinner"></div> Mencetak...</>
                        ) : (
                            <>🖨️ Cetak ke Thermal Printer</>
                        )}
                    </button>
                </div>
            )}

            {status && (
                <div className={`status-badge ${status.type === 'success' ? 'status-success' : 'status-error'}`}>
                    {status.message}
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

export default BarcodeGenerator;