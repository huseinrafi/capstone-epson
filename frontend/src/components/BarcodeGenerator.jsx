import { useState } from 'react';
import axios from 'axios';
import Barcode from 'react-barcode';

function BarcodeGenerator() {
    const [name, setName] = useState('');
    const [barcodeData, setBarcodeData] = useState(null);

    const handleGenerate = async () => {
        try {
            const res = await axios.post('http://localhost:8000/api/items', { name });
            setBarcodeData(res.data.data);
        } catch (error) {
            alert('Gagal generate barcode');
        }
    };

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Generator Barcode</h1>
            <input
                type="text"
                placeholder="Nama Barang"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: '10px', marginRight: '10px' }}
            />
            <button onClick={handleGenerate} style={{ padding: '10px 20px' }}>
                Buat Barcode
            </button>

            {barcodeData && (
                <div style={{ marginTop: '30px' }}>
                    <Barcode value={barcodeData.barcode} />
                    <p>Barcode: {barcodeData.barcode}</p>
                    <p>Nama: {barcodeData.name}</p>
                    <a href="/scan" style={{ display: 'block', marginTop: '20px' }}>
                        Ke Halaman Scan →
                    </a>
                </div>
            )}
        </div>
    );
}

export default BarcodeGenerator;