import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { EyeIcon, EyeSlashIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const router = useRouter();

  // Check if already authenticated
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        router.push('/dashboard');
      }
    } catch {
      // Not authenticated, stay on login page
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { role: 'Super Admin', username: 'superadmin', password: 'HaloBuzz2024!', description: 'Full system access' },
    { role: 'Admin', username: 'admin', password: 'Admin123!', description: 'High-level administration' },
    { role: 'Moderator', username: 'moderator', password: 'Mod123!', description: 'Content moderation' },
    { role: 'Support', username: 'support', password: 'Support123!', description: 'Customer support' }
  ];

  const quickLogin = (creds: { username: string; password: string }) => {
    setUsername(creds.username);
    setPassword(creds.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <Head>
        <title>Login - HaloBuzz Admin</title>
      </Head>

      <div className="max-w-md w-full space-y-8">
        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center items-center mb-4">
              <CpuChipIcon className="h-12 w-12 text-blue-600" />
              <h1 className="ml-3 text-3xl font-bold text-gray-900">HaloBuzz</h1>
            </div>
            <h2 className="text-xl text-gray-600">Admin Dashboard</h2>
            <p className="text-sm text-gray-500 mt-2">Secure access to administrative controls</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your username or email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showCredentials ? 'Hide' : 'Show'} Demo Credentials
            </button>
          </div>
        </div>

        {/* Demo Credentials Card */}
        {showCredentials && (
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Accounts</h3>
            <div className="space-y-3">
              {demoCredentials.map((cred, index) => (
                <div
                  key={index}
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => quickLogin(cred)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{cred.role}</div>
                      <div className="text-sm text-gray-600">{cred.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-mono">{cred.username}</span> • <span className="font-mono">{cred.password}</span>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 font-medium">Click to use</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> These are demo credentials for testing. In production, use strong, unique passwords and enable 2FA.
              </p>
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="text-center text-white/80 text-sm">
          <p>🔒 Secure authentication • 🛡️ Role-based access control</p>
          <p className="mt-1">Protected by enterprise-grade security</p>
        </div>
      </div>
    </div>
  );
}


