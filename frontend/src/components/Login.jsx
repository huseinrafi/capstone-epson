import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login gagal. Periksa kredensial Anda.');
      }

      if (response.ok && result.success) {
        localStorage.setItem('token', result.data.access_token);
        localStorage.setItem('user', JSON.stringify(result.data.user));

        const userRole = result.data.user.role;
        localStorage.setItem('role', userRole);

        if (userRole === 'operator_checker' || userRole === 'operator') {
          navigate('/inbound');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#F8F9FA] font-sans">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-[#002060] font-bold text-xl tracking-wide">EPSON</h1>
          <h2 className="text-gray-600 text-sm tracking-widest">LOGISTICS SYSTEMS</h2>
        </div>

        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <h3 className="text-center text-[#002060] font-medium mb-1">LOGIN</h3>
          <p className="text-center text-gray-500 text-sm mb-6">PT. Indonesia Epson Industry</p>

          {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#002060] mb-1 flex items-center gap-2">
                <span className="text-[#002060]">👤</span> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#002060] mb-1 flex items-center gap-2">
                <span className="text-[#002060]">🔒</span> PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#002060] text-white text-sm font-medium py-3 mt-4 flex justify-center items-center gap-2 hover:bg-blue-900 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Memproses...' : 'LOGIN'}
              {!isLoading && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Belum punya akun? </span>
            <Link to="/register" className="text-[#002060] font-semibold hover:underline">
              Daftar di sini
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <span>🛡️</span> EPSON SVSB v0.1.0
        </div>
      </div>
    </div>
  );
}