import React, { useState } from 'react';
import {
  X,
  Globe,
  Database,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Server,
  Lock,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { wpAuthService, WordPressConnectionConfig } from '../services/wordpressAuthService';
import { APP_CONFIG } from '../config/appConfig';

interface WordPressAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onWordPressLoginSuccess: (userData: Partial<UserProfile>) => void;
}

export const WordPressAuthModal: React.FC<WordPressAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onWordPressLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'config'>('login');
  const [config, setConfig] = useState<WordPressConnectionConfig>(wpAuthService.getConfig());

  // Login Form
  const [username, setUsername] = useState<string>('admin@velocity.web.id');
  const [password, setPassword] = useState<string>('••••••••');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginFeedback, setLoginFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Connection Test
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ reachable: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginFeedback(null);

    const result = await wpAuthService.loginWithWordPress(username, password);
    setIsLoading(false);
    setLoginFeedback({ success: result.success, message: result.message });

    if (result.success && result.user) {
      onWordPressLoginSuccess(result.user);
      setTimeout(() => {
        onClose();
        setLoginFeedback(null);
      }, 1200);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    wpAuthService.saveConfig(config);
    alert('Konfigurasi integrasi WordPress dan Database berhasil disimpan!');
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setTestResult(null);
    const res = await wpAuthService.testWordPressConnection();
    setIsTestingConn(false);
    setTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-7 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Autentikasi & Database WordPress</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                velocity.web.id
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hubungkan akun pengguna dan sinkronisasi poin ke database MySQL WordPress Anda.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 p-1 rounded-lg bg-slate-950 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
              activeTab === 'login'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Login dengan Akun WordPress
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
              activeTab === 'config'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Konfigurasi Database & REST API
          </button>
        </div>

        {/* Tab 1: WordPress Login */}
        {activeTab === 'login' && (
          <div className="mt-5 space-y-4">
            <div className="p-3.5 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-slate-300 leading-relaxed">
              <div className="font-semibold text-blue-300 flex items-center gap-1.5 mb-1">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Autentikasi Terpadu (Single Sign-On WordPress)</span>
              </div>
              Pengguna di situs WordPress <strong>velocity.web.id</strong> (tabel <code className="text-blue-300">wp_users</code>) dapat langsung login di sini menggunakan username atau email mereka. Peran administrator di WordPress otomatis menjadi Administrator di sistem ini.
            </div>

            {loginFeedback && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  loginFeedback.success
                    ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-300'
                    : 'border-rose-500/50 bg-rose-950/50 text-rose-300'
                }`}
              >
                {loginFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{loginFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username / Email WordPress
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="admin@velocity.web.id"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password Akun WordPress
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Password..."
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Target: <strong>{config.wpUrl}</strong></span>
                <span className="text-slate-500 font-mono">Mode: {config.authMode.toUpperCase()}</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                {isLoading ? (
                  <span>Menghubungi WordPress REST API...</span>
                ) : (
                  <>
                    <span>Login & Hubungkan Akun WordPress</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Database & Architecture Configuration */}
        {activeTab === 'config' && (
          <div className="mt-5 space-y-4">
            {/* Database Architecture Explanation */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 text-xs space-y-2">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Bagaimana Database WordPress Digunakan?</span>
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Di Hostinger, WordPress Anda berjalan di atas database <strong>MySQL / MariaDB</strong>. {APP_CONFIG.fullName} terhubung melalui <strong>WordPress REST API</strong>:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-blue-400 block font-semibold">Tabel `wp_users`:</span>
                  <span className="text-slate-400">Menyimpan akun login, email, password hash, dan hak akses.</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-emerald-400 block font-semibold">Tabel `wp_usermeta`:</span>
                  <span className="text-slate-400">Menyimpan saldo poin ({config.userMetaKey}) dan level VIP.</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Website WordPress Utama
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={config.wpUrl}
                    onChange={(e) => setConfig({ ...config, wpUrl: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    placeholder="https://velocity.web.id"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConn}
                    className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors shrink-0"
                  >
                    {isTestingConn ? 'Menguji...' : 'Uji Koneksi'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.reachable
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/50 border border-amber-500/40 text-amber-300'
                  }`}
                >
                  {testResult.reachable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mode Autentikasi
                  </label>
                  <select
                    value={config.authMode}
                    onChange={(e) => setConfig({ ...config, authMode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="simulated">Simulasi / LocalStorage (Bebas CORS)</option>
                    <option value="jwt">Live WP REST API + JWT Token</option>
                    <option value="app_password">Live WP Application Passwords</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Meta Key Poin WordPress
                  </label>
                  <input
                    type="text"
                    value={config.userMetaKey}
                    onChange={(e) => setConfig({ ...config, userMetaKey: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>

            {/* Plugin Setup instructions */}
            <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block mb-1">
                Langkah Mengaktifkan JWT di WordPress velocity.web.id:
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Buka WP Admin (`velocity.web.id/wp-admin`) -&gt; Plugins -&gt; Add New.</li>
                <li>Cari dan aktifkan plugin gratis: <strong>"JWT Authentication for WP REST API"</strong> atau gunakan fitur bawaan <strong>Application Passwords</strong> (tersedia gratis di WordPress 5.6+).</li>
                <li>Tambahkan secret key di file <code className="text-slate-300">wp-config.php</code> WordPress: <code className="text-slate-300">define('JWT_AUTH_SECRET_KEY', 'kunci-rahasia-anda');</code>.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
