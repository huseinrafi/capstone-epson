import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.password_confirmation) {
      return setError("Konfirmasi password tidak cocok.");
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registrasi gagal. Periksa kembali data Anda.');
      }

      // Langsung simpan token jika API register mengembalikan token
      localStorage.setItem('token', data.data.access_token);
      localStorage.setItem('role', data.data.user.role);

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-[#F8F9FA] font-sans py-8">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-[#002060] font-bold text-xl tracking-wide">EPSON</h1>
          <h2 className="text-gray-600 text-sm tracking-widest">LOGISTICS SYSTEMS</h2>
        </div>

        <div className="bg-white border border-gray-200 p-8 shadow-sm">
          <h3 className="text-center text-[#002060] font-medium mb-1">REGISTER</h3>
          <p className="text-center text-gray-500 text-sm mb-6">Buat akun baru</p>

          {error && <p className="text-red-500 text-xs mb-4 text-center">{error}</p>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nama Lengkap"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Username"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <div>
              <input
                type="password"
                name="password_confirmation"
                value={formData.password_confirmation}
                onChange={handleChange}
                placeholder="Konfirmasi Password"
                className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-[#002060] text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#002060] text-white text-sm font-medium py-3 mt-2 hover:bg-blue-900 transition-colors disabled:bg-gray-400"
            >
              {isLoading ? 'Memproses...' : 'DAFTAR'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Sudah punya akun? </span>
            <Link to="/login" className="text-[#002060] font-semibold hover:underline">
              Login di sini
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}