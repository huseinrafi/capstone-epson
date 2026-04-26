import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const navigate = useNavigate();
    
    // Check Auth
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if(!user) {
        return (
            <div className="glass-panel">
                <h2>Anda belum login</h2>
                <button onClick={() => navigate('/login')} className="btn btn-primary">Ke Login</button>
            </div>
        );
    }

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    }

    return (
        <div className="glass-panel">
            <h1>Halo, {user.name}</h1>
            <p className="subtitle">Role Akses: <strong style={{color:'var(--primary)'}}>{user.role.toUpperCase()}</strong></p>
            
            {user.role === 'operator_checker' && user.node_id && (
                <div className="status-badge status-success" style={{marginBottom: '1rem'}}>
                    Menyambung ke Node Server ID: {user.node_id}
                </div>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                {user.role === 'operator_checker' && (
                    <>
                        <button onClick={() => navigate('/scan')} className="btn btn-primary">📷 Buka Scanner Eksekusi</button>
                        <button onClick={() => navigate('/generator')} className="btn btn-secondary">🖨️ Internal Barcode Generator</button>
                    </>
                )}

                {(user.role === 'admin_gudang' || user.role === 'supervisor') && (
                    <button className="btn btn-primary" disabled>📋 Manifes DO & Transit (Segera)</button>
                )}

                {(user.role === 'manajer' || user.role === 'supervisor') && (
                    <button className="btn btn-accent" disabled>📊 Buka Dashboard Analitik</button>
                )}

                <button onClick={handleLogout} className="btn btn-accent" style={{marginTop:'1.5rem'}}>
                    Log Keluar / Ganti Role
                </button>
            </div>
        </div>
    );
}

export default Dashboard;
