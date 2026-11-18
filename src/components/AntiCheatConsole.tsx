import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Eye,
  Activity,
  CheckCircle2,
  RefreshCw,
  Terminal,
  HelpCircle,
  Clock,
  Zap,
  Filter,
  Download
} from 'lucide-react';
import { AntiCheatLogEntry, AntiCheatSeverity, AntiCheatStatus } from '../types';
import { antiCheatEngine } from '../services/antiCheatEngine';
import { APP_NAME } from '../config/appConfig';

interface AntiCheatConsoleProps {
  logs: AntiCheatLogEntry[];
  onTriggerChallenge: () => void;
}

export const AntiCheatConsole: React.FC<AntiCheatConsoleProps> = ({
  logs,
  onTriggerChallenge,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [antiCheatStatus, setAntiCheatStatus] = useState<AntiCheatStatus>(antiCheatEngine.getStatus());
  const [testNotification, setTestNotification] = useState<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      setAntiCheatStatus(antiCheatEngine.getStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterSeverity === 'all') return true;
    return log.severity === filterSeverity;
  });

  const runTestVector = (type: string) => {
    if (type === 'visibility') {
      setTestNotification('Simulasi: Mendeteksi tab browser di latar belakang (visibilityState = hidden)...');
      antiCheatEngine.triggerSimulatedViolation('VISIBILITY_LOST');
      setAntiCheatStatus(antiCheatEngine.getStatus());
    } else if (type === 'zero_entropy') {
      setTestNotification('Simulasi: Mendeteksi aktivitas bot AFK / kursor dengan entropi 0%...');
      antiCheatEngine.triggerSimulatedViolation('LOW_ENTROPY_DETECTED');
      setAntiCheatStatus(antiCheatEngine.getStatus());
    } else if (type === 'speed_hack') {
      setTestNotification('Simulasi: Menguji pendeteksian speed-hack / manipulasi interval clock browser...');
      antiCheatEngine.triggerSimulatedViolation('TIME_DRIFT_PREVENTED');
      setAntiCheatStatus(antiCheatEngine.getStatus());
    } else if (type === 'frame_bust') {
      setTestNotification('Simulasi: Menguji pertahanan frame-busting sandbox...');
      antiCheatEngine.triggerSimulatedViolation('FRAME_BUST_INTERCEPTED');
      setAntiCheatStatus(antiCheatEngine.getStatus());
    } else if (type === 'multitab') {
      setTestNotification('Simulasi: Menguji penguncian proteksi multi-tab simultan...');
      antiCheatEngine.triggerSimulatedViolation('CONCURRENCY_LOCKED');
      setAntiCheatStatus(antiCheatEngine.getStatus());
    } else if (type === 'challenge') {
      onTriggerChallenge();
    }

    setTimeout(() => {
      setTestNotification('');
    }, 4000);
  };

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${APP_NAME.toLowerCase()}_anticheat_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Pusat Integritas & Mesin Anti-Cheat Nusantara
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Mekanisme perlindungan 6 lapis untuk memastikan setiap poin trafik berasal dari kunjungan manusia nyata di Indonesia, bukan bot, skrip otomatis, atau tab tersembunyi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-xs font-mono text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Aktif & Terlindungi
            </span>
          </div>
        </div>
      </div>

      {/* 6 Security Layers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Layer 1 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
            <Eye className="w-4 h-4" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Pengawas Tab & Fokus (Visibility Guard)
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Mendeteksi jika peselancar meminimalkan browser atau membuka tab lain. Hitungan waktu dan distribusi poin otomatis dijeda agar tidak ada trafik hantu di latar belakang.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Status Tab:</span>
            <span className={`font-medium ${antiCheatStatus.tabFocused ? 'text-emerald-400' : 'text-rose-400'}`}>
              {antiCheatStatus.tabFocused ? 'Aktif & Fokus' : 'Latar Belakang (Dijeda)'}
            </span>
          </div>
        </div>

        {/* Layer 2 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-cyan-400 mb-1.5">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Pelacak Entropi Kursor Manusia
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Menganalisis variasi kurva vektor dan percepatan mouse. Gerakan garis lurus robotik atau keheningan mouse tanpa entropi (&gt;30s) akan ditandai untuk diverifikasi.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Skor Entropi:</span>
            <span className="font-mono tabular-nums text-cyan-400 font-semibold">
              {antiCheatStatus.mouseEntropyScore}% (Organik)
            </span>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-1.5">
            <Clock className="w-4 h-4" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              3. Anti-Speedhack & Token Nonce
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Menghitung selisih waktu fisik nyata vs waktu browser. Ekstensi akselerasi waktu atau manipulasi tick JavaScript akan langsung digagalkan dan ditolak.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Detak Heartbeat:</span>
            <span className="text-amber-400 font-mono text-[11px]">HMAC Berurutan Valid</span>
          </div>
        </div>

        {/* Layer 4 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
            <Lock className="w-4 h-4" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              4. Perisai Sandbox & Anti-Frame-Bust
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Menahan situs nakal yang mencoba membajak jendela selancar menggunakan manipulasi <code className="text-slate-300">top.location</code> atau popup spam yang mengganggu pengguna.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Isolasi Sandbox:</span>
            <span className="text-emerald-400 font-medium">Terisolasi Ketat</span>
          </div>
        </div>

        {/* Layer 5 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-1.5">
            <Zap className="w-4 h-4" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              5. Kunci Konkurensi Multi-Tab
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Menggunakan <code className="text-slate-300">BroadcastChannel</code> untuk memastikan 1 akun browser hanya dapat menjalankan 1 sesi selancar aktif, melarang farming multi-tab ilegal.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Status Sesi:</span>
            <span className="text-purple-400 font-medium">1 Sesi Eksklusif</span>
          </div>
        </div>

        {/* Layer 6 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-rose-400 mb-1.5">
            <ShieldAlert className="w-4 h-4" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              6. Pemindai Kepatuhan Hukum Kominfo
            </h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Penyaringan otomatis terhadap kata kunci judi online/slot gacor, penipuan phising, dan konten ilegal sebelum website diizinkan masuk ke rotasi audiens Indonesia.
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Filter Kominfo:</span>
            <span className="text-emerald-400 font-medium">100% Bebas Judi Slot</span>
          </div>
        </div>
      </div>

      {/* Interactive Anti-Cheat Testing Sandbox */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Kotak Uji Coba Anti-Cheat (Security Sandbox Test)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Uji langsung kehandalan masing-masing vektor deteksi untuk membuktikan keadilan penukaran poin.
            </p>
          </div>
        </div>

        {testNotification && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{testNotification}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => runTestVector('visibility')}
            className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-200 block group-hover:text-emerald-400">
              1. Uji Pindah Tab
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Simulasi tab background
            </span>
          </button>

          <button
            onClick={() => runTestVector('zero_entropy')}
            className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-200 block group-hover:text-cyan-400">
              2. Uji Bot AFK
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Simulasi kursor 0 entropi
            </span>
          </button>

          <button
            onClick={() => runTestVector('speed_hack')}
            className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-200 block group-hover:text-amber-400">
              3. Uji Speed-Hack
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Simulasi percepatan tick
            </span>
          </button>

          <button
            onClick={() => runTestVector('frame_bust')}
            className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-200 block group-hover:text-purple-400">
              4. Uji Frame-Bust
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Simulasi hijack lokasi
            </span>
          </button>

          <button
            onClick={() => runTestVector('multitab')}
            className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-200 block group-hover:text-rose-400">
              5. Uji Multi-Tab
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Simulasi sesi ganda
            </span>
          </button>

          <button
            onClick={() => runTestVector('challenge')}
            className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-200 block group-hover:text-emerald-400">
              6. Tantangan PoP
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Picu modal verifikasi
            </span>
          </button>
        </div>
      </div>

      {/* Security Audit Feed */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Log Audit Keamanan Real-Time</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Catatan transparan setiap deteksi integritas, verifikasi token, dan penambahan poin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setFilterSeverity('all')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  filterSeverity === 'all'
                    ? 'bg-slate-800 text-slate-100 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({logs.length})
              </button>
              <button
                onClick={() => setFilterSeverity('info')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  filterSeverity === 'info'
                    ? 'bg-slate-800 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setFilterSeverity('warning')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  filterSeverity === 'warning'
                    ? 'bg-slate-800 text-amber-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Peringatan
              </button>
              <button
                onClick={() => setFilterSeverity('critical')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                  filterSeverity === 'critical'
                    ? 'bg-slate-800 text-rose-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kritis
              </button>
            </div>

            {/* Export */}
            <button
              onClick={exportLogsAsJson}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Unduh Log Audit JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audit Log Entries List */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Tidak ada log untuk filter yang dipilih.
            </div>
          ) : (
            filteredLogs.map((entry) => {
              let badgeColor = 'text-emerald-400 border-emerald-800/40 bg-emerald-950/30';
              if (entry.severity === 'warning') {
                badgeColor = 'text-amber-400 border-amber-800/40 bg-amber-950/30';
              } else if (entry.severity === 'critical') {
                badgeColor = 'text-rose-400 border-rose-800/40 bg-rose-950/30';
              }

              const timeStr = new Date(entry.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/70 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500 tabular-nums text-[11px]">
                        {timeStr}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="font-semibold text-slate-200">{entry.title}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
                      {entry.details}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                    {entry.metricValue && (
                      <span className="font-mono text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {entry.metricValue}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${badgeColor}`}>
                      {entry.severity}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
