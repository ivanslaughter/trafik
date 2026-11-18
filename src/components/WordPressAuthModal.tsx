import React, { useState } from 'react';
import {
  X,
  Globe,
  Database,
  CheckCircle2,
  AlertCircle,
  Server,
  ArrowRight,
  Download,
  UserPlus,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  wpAuthService,
  WordPressConnectionConfig,
  BridgeHealthResponse,
} from '../services/wordpressAuthService';
import { APP_CONFIG } from '../config/appConfig';

interface WordPressAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onWordPressLoginSuccess: (userData: UserProfile) => void;
  onWordPressLogout?: () => void;
}

export const WordPressAuthModal: React.FC<WordPressAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onWordPressLoginSuccess,
  onWordPressLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'config'>('login');
  const [authAction, setAuthAction] = useState<'login' | 'register'>('login');
  const [config, setConfig] = useState<WordPressConnectionConfig>(wpAuthService.getConfig());

  // Login / Register Form
  const [name, setName] = useState<string>('');
  const [city, setCity] = useState<string>('Jakarta');
  const [username, setUsername] = useState<string>('admin@velocity.web.id');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginFeedback, setLoginFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Connection Test & Config Save Feedback
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<BridgeHealthResponse | null>(null);
  const [configSavedMsg, setConfigSavedMsg] = useState<string>('');

  if (!isOpen) return null;

  const isLiveConnected = wpAuthService.isLiveBridgeActive();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginFeedback(null);

    if (authAction === 'register') {
      const result = await wpAuthService.registerWithWordPress(name, username, password, city);
      setIsLoading(false);
      setLoginFeedback({ success: result.success, message: result.message });
      if (result.success && result.user) {
        onWordPressLoginSuccess(result.user);
        setTimeout(() => {
          onClose();
          setLoginFeedback(null);
        }, 1000);
      }
      return;
    }

    const result = await wpAuthService.loginWithWordPress(username, password || 'demo');
    setIsLoading(false);
    setLoginFeedback({ success: result.success, message: result.message });

    if (result.success && result.user) {
      onWordPressLoginSuccess(result.user);
      setTimeout(() => {
        onClose();
        setLoginFeedback(null);
      }, 1000);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    wpAuthService.saveConfig(config);
    setConfigSavedMsg('Pengaturan WordPress Plugin Bridge berhasil disimpan.');
    setTimeout(() => setConfigSavedMsg(''), 3000);
  };

  const handleTestConnection = async () => {
    wpAuthService.saveConfig(config);
    setIsTestingConn(true);
    setTestResult(null);
    const res = await wpAuthService.testWordPressConnection();
    setIsTestingConn(false);
    setTestResult(res);
  };

  const handleDisconnect = () => {
    wpAuthService.logout();
    onWordPressLogout?.();
    setLoginFeedback({
      success: true,
      message: 'Sesi WordPress Bridge diputuskan. Beralih kembali ke mode lokal.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-7 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex flex-wrap items-center gap-2">
              <span>WordPress Plugin Bridge & MySQL</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                {config.wpUrl.replace(/^https?:\/\//, '')}
              </span>
              {isLiveConnected && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700">
                  MySQL Terhubung
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sinkronisasi akun WordPress (`wp_users`), poin, kampanye website, dan log anti-cheat langsung ke MySQL Hostinger.
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
            Login / Daftar Akun WordPress
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer text-center ${
              activeTab === 'config'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Setup Plugin Bridge & MySQL
          </button>
        </div>

        {/* Tab 1: WordPress Login / Register */}
        {activeTab === 'login' && (
          <div className="mt-5 space-y-4">
            {isLiveConnected && (
              <div className="p-3.5 rounded-xl border border-emerald-700/40 bg-emerald-950/30 text-xs flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Terhubung ke MySQL WordPress sebagai {currentUser.name}</span>
                  </div>
                  <div className="text-slate-400 mt-0.5 font-mono text-[11px]">
                    {currentUser.email} · Saldo: {currentUser.points.toLocaleString('id-ID')} Poin
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan Sesi</span>
                </button>
              </div>
            )}

            <div className="p-3.5 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-slate-300 leading-relaxed">
              <div className="font-semibold text-blue-300 flex items-center justify-between gap-2 mb-1">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span>Autentikasi Terpadu (`wp_users`)</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Mode: {config.authMode === 'bridge' ? 'LIVE MYSQL BRIDGE' : 'SIMULASI LOKAL'}
                </span>
              </div>
              {config.authMode === 'bridge' ? (
                <span>
                  Terhubung ke <code className="text-blue-300">/wp-json/trafik/v1</code>. Gunakan username/email &amp; password asli WordPress Anda di <strong>{config.wpUrl}</strong>.
                </span>
              ) : (
                <span>
                  Saat ini aktif dalam <strong>Mode Simulasi</strong>. Untuk menyimpan data nyata ke MySQL Hostinger, pasang plugin <strong>Trafik WP Bridge</strong> lalu aktifkan mode Live di tab <em>Setup Plugin Bridge &amp; MySQL</em>.
                </span>
              )}
            </div>

            {config.authMode === 'bridge' && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthAction('login');
                    setLoginFeedback(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    authAction === 'login'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Akun</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthAction('register');
                    setLoginFeedback(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    authAction === 'register'
                      ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar Member Baru</span>
                </button>
              </div>
            )}

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

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authAction === 'register' && config.authMode === 'bridge' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      placeholder="Budi Santoso"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Kota Asal
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                      placeholder="Jakarta"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {authAction === 'register' ? 'Alamat Email' : 'Username / Email WordPress'}
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
                  required={config.authMode === 'bridge'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder={config.authMode === 'bridge' ? 'Password WordPress Anda...' : 'Opsional di mode simulasi...'}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghubungi WordPress Plugin Bridge...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {authAction === 'register'
                        ? 'Daftar & Simpan ke MySQL WordPress'
                        : 'Login & Sinkronkan Data MySQL'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Plugin Setup & MySQL Architecture Configuration */}
        {activeTab === 'config' && (
          <div className="mt-5 space-y-4">
            {/* Download Plugin Banner */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Server className="w-4 h-4" />
                    <span>Plugin WordPress: Trafik WP Bridge v1.0.0</span>
                  </h4>
                  <p className="text-slate-400 mt-1">
                    Plugin mandiri (tanpa plugin JWT tambahan). Otomatis membuat tabel MySQL <code className="text-slate-200">wp_trafik_campaigns</code>, <code className="text-slate-200">wp_trafik_anticheat_logs</code>, dan menyimpan poin di <code className="text-slate-200">wp_usermeta</code>.
                  </p>
                </div>
                <a
                  href="./trafik-wp-bridge.zip"
                  download="trafik-wp-bridge.zip"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-lg shadow-emerald-950/40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Plugin (.zip)</span>
                </a>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 pt-2 border-t border-emerald-900/40">
                <li>Unduh file <code className="text-emerald-300">trafik-wp-bridge.zip</code> di atas.</li>
                <li>Masuk ke <strong>WP Admin ({config.wpUrl}/wp-admin) → Plugins → Add New → Upload Plugin</strong>, lalu <strong>Activate</strong>.</li>
                <li>Klik <strong>Uji Koneksi Bridge</strong> di bawah, ubah mode ke <strong>Live WordPress Plugin Bridge</strong>, lalu login di tab sebelah.</li>
              </ol>
            </div>

            {configSavedMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{configSavedMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Website WordPress Utama
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    required
                    value={config.wpUrl}
                    onChange={(e) => setConfig({ ...config, wpUrl: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                    placeholder="https://velocity.web.id"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConn}
                    className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors shrink-0"
                  >
                    {isTestingConn ? 'Menguji...' : 'Uji Koneksi Bridge'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                    testResult.pluginInstalled && testResult.dbReady
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                      : testResult.reachable
                      ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testResult.pluginInstalled && testResult.dbReady ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div>{testResult.message}</div>
                    {testResult.pluginInstalled && !config.authMode.includes('bridge') && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...config, authMode: 'bridge' as const };
                          setConfig(updated);
                          wpAuthService.saveConfig(updated);
                          setConfigSavedMsg('Mode Live WordPress Plugin Bridge diaktifkan!');
                        }}
                        className="underline font-semibold text-white hover:text-emerald-200 cursor-pointer"
                      >
                        Aktifkan Mode Live Bridge Sekarang →
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mode Koneksi Database
                  </label>
                  <select
                    value={config.authMode}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        authMode: e.target.value as WordPressConnectionConfig['authMode'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="bridge">Live WordPress Plugin Bridge (MySQL)</option>
                    <option value="simulated">Mode Simulasi / LocalStorage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Meta Key Poin di `wp_usermeta`
                  </label>
                  <input
                    type="text"
                    value={config.userMetaKey}
                    onChange={(e) => setConfig({ ...config, userMetaKey: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>{APP_CONFIG.fullName} · Endpoint: /wp-json/trafik/v1</span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
