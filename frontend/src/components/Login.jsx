import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
    const [role, setRole] = useState('');
    const [nodeId, setNodeId] = useState('');
    const [nodes, setNodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Mock API Fetch for Nodes (Bisa diganti api beneran /api/nodes)
    useEffect(() => {
        // Simulasi Node Data dari Backend Server Phase 1
        setNodes([
            { id: 1, name: 'Gate 1 Inbound', type: 'INBOUND_GATE' },
            { id: 2, name: 'Gate 2 Inbound', type: 'INBOUND_GATE' },
            { id: 3, name: 'Warehouse Area A', type: 'WAREHOUSE' },
            { id: 4, name: 'Warehouse Area B', type: 'WAREHOUSE' },
            { id: 5, name: 'Transit Hub Jakarta', type: 'TRANSIT' }
        ]);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!role) {
            alert('Pilih Role Anda terlebih dahulu');
            return;
        }

        if (role === 'operator_checker' && !nodeId) {
            alert('Operator Scanner wajib memilih Node asal bekerja!');
            return;
        }

        setIsLoading(true);
        try {
            // Kita panggil langsung /api/login karena sudah diproxy otomatis oleh Vite ke Backend
            const apiUrl = '/api/login';
            
            const res = await axios.post(apiUrl, { 
                role: role,
                node_id: nodeId || null
            });

            if(res.data.access_token) {
                // Simpan token untuk proteksi URL berikutnya
                localStorage.setItem('token', res.data.access_token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                
                alert("Login Sukses! Token JWT didapatkan.");
                
                // Redirect dashboard
                navigate('/dashboard');
            }
        } catch (error) {
            console.error(error);
            alert('Gagal login ke API Server. Pastikan Backend & DB menyala.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-panel">
            <div>
                <h1>SVSB System</h1>
                <p className="subtitle">Sistem Verifikasi Serah-Terima Barang</p>
            </div>

            <form onSubmit={handleLogin} className="input-group">
                <label className="input-label">Identitas Role</label>
                <select 
                    className="modern-input" 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                >
                    <option value="">-- Pilih Role Anda --</option>
                    <option value="operator_checker">1. Operator Checker (Scanner)</option>
                    <option value="admin_gudang">2. Admin Gudang</option>
                    <option value="supervisor">3. Supervisor</option>
                    <option value="manajer">4. Manajer Eksekutif</option>
                </select>

                {role === 'operator_checker' && (
                    <div style={{marginTop: '1rem', animation: 'fadeIn 0.3s'}}>
                        <label className="input-label">Node Lokasi Kerja</label>
                        <select 
                            className="modern-input" 
                            value={nodeId} 
                            onChange={(e) => setNodeId(e.target.value)}
                        >
                            <option value="">-- Pilih Node Station --</option>
                            {nodes.map(node => (
                                <option key={node.id} value={node.id}>
                                    [{node.type}] {node.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                
                <button type="submit" className="btn btn-primary" style={{marginTop: '1.5rem'}} disabled={isLoading}>
                    {isLoading ? 'Menghubungkan...' : '🗝 Masuk (Login)'}
                </button>
            </form>
        </div>
    );
}

export default Login;
