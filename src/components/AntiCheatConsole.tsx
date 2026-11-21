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
import { VwsGridFrame, VwsRowDivider, VwsBottomLine, VwsTopLine, VwsSmartLine, VwsColumnDivider } from './VwsSmartLine';

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

  const securityLayers = [
    {
      id: 'layer-1',
      icon: <Eye className="w-4 h-4" />,
      iconColor: 'text-emerald-400',
      title: '1. Pengawas Tab & Fokus (Visibility Guard)',
      description:
        'Mendeteksi jika peselancar meminimalkan browser atau membuka tab lain. Hitungan waktu dan distribusi poin otomatis dijeda agar tidak ada trafik hantu di latar belakang.',
      metricLabel: 'Status Tab:',
      metricValue: antiCheatStatus.tabFocused ? 'Aktif & Fokus' : 'Latar Belakang (Dijeda)',
      metricClass: `font-medium ${antiCheatStatus.tabFocused ? 'text-emerald-400' : 'text-rose-400'}`,
    },
    {
      id: 'layer-2',
      icon: <Activity className="w-4 h-4" />,
      iconColor: 'text-cyan-400',
      title: '2. Pelacak Entropi Kursor Manusia',
      description:
        'Menganalisis variasi kurva vektor dan percepatan mouse. Gerakan garis lurus robotik atau keheningan mouse tanpa entropi (>30s) akan ditandai untuk diverifikasi.',
      metricLabel: 'Skor Entropi:',
      metricValue: `${antiCheatStatus.mouseEntropyScore}% (Organik)`,
      metricClass: 'font-mono tabular-nums text-cyan-400 font-semibold',
    },
    {
      id: 'layer-3',
      icon: <Clock className="w-4 h-4" />,
      iconColor: 'text-amber-400',
      title: '3. Anti-Speedhack & Token Nonce',
      description:
        'Menghitung selisih waktu fisik nyata vs waktu browser. Ekstensi akselerasi waktu atau manipulasi tick JavaScript akan langsung digagalkan dan ditolak.',
      metricLabel: 'Detak Heartbeat:',
      metricValue: 'HMAC Berurutan Valid',
      metricClass: 'text-amber-400 font-mono text-[11px]',
    },
    {
      id: 'layer-4',
      icon: <Lock className="w-4 h-4" />,
      iconColor: 'text-emerald-400',
      title: '4. Perisai Sandbox & Anti-Frame-Bust',
      description: (
        <>
          Menahan situs nakal yang mencoba membajak jendela selancar menggunakan manipulasi{' '}
          <code className="text-slate-300">top.location</code> atau popup spam yang mengganggu pengguna.
        </>
      ),
      metricLabel: 'Isolasi Sandbox:',
      metricValue: 'Terisolasi Ketat',
      metricClass: 'text-emerald-400 font-medium',
    },
    {
      id: 'layer-5',
      icon: <Zap className="w-4 h-4" />,
      iconColor: 'text-purple-400',
      title: '5. Kunci Konkurensi Multi-Tab',
      description: (
        <>
          Menggunakan <code className="text-slate-300">BroadcastChannel</code> untuk memastikan 1 akun browser hanya dapat menjalankan 1 sesi selancar aktif, melarang farming multi-tab ilegal.
        </>
      ),
      metricLabel: 'Status Sesi:',
      metricValue: '1 Sesi Eksklusif',
      metricClass: 'text-purple-400 font-medium',
    },
    {
      id: 'layer-6',
      icon: <ShieldAlert className="w-4 h-4" />,
      iconColor: 'text-rose-400',
      title: '6. Pemindai Kepatuhan Hukum Kominfo',
      description:
        'Penyaringan otomatis terhadap kata kunci judi online/slot gacor, penipuan phising, dan konten ilegal sebelum website diizinkan masuk ke rotasi audiens Indonesia.',
      metricLabel: 'Filter Kominfo:',
      metricValue: '100% Bebas Judi Slot',
      metricClass: 'text-emerald-400 font-medium',
    },
  ];

  const sandboxTests = [
    {
      key: 'visibility',
      title: '1. Uji Pindah Tab',
      subtitle: 'Simulasi tab background',
      hoverClass: 'group-hover:text-emerald-400',
    },
    {
      key: 'zero_entropy',
      title: '2. Uji Bot AFK',
      subtitle: 'Simulasi kursor 0 entropi',
      hoverClass: 'group-hover:text-cyan-400',
    },
    {
      key: 'speed_hack',
      title: '3. Uji Speed-Hack',
      subtitle: 'Simulasi percepatan tick',
      hoverClass: 'group-hover:text-amber-400',
    },
    {
      key: 'frame_bust',
      title: '4. Uji Frame-Bust',
      subtitle: 'Simulasi hijack lokasi',
      hoverClass: 'group-hover:text-purple-400',
    },
    {
      key: 'multitab',
      title: '5. Uji Multi-Tab',
      subtitle: 'Simulasi sesi ganda',
      hoverClass: 'group-hover:text-rose-400',
    },
    {
      key: 'challenge',
      title: '6. Tantangan PoP',
      subtitle: 'Picu modal verifikasi',
      hoverClass: 'group-hover:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="relative pb-4">
        <VwsBottomLine bleedPx={16} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Pusat Integritas & Mesin Anti-Cheat
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

      {/* 6 Security Layers Grid — Gapless Architectural vws-line* Grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-slate-900/70">
        <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />

        {/* Tablet 2-column continuous center vertical divider */}
        <VwsSmartLine
          orientation="vertical"
          offsetStart="26px"
          offsetEnd="26px"
          className="hidden md:block lg:hidden absolute left-1/2 z-10"
          style={{ top: '-18px', height: 'calc(100% + 36px)' }}
        />

        {/* Desktop 3-column continuous vertical dividers */}
        <VwsSmartLine
          orientation="vertical"
          offsetStart="26px"
          offsetEnd="26px"
          className="hidden lg:block absolute left-1/3 z-10"
          style={{ top: '-18px', height: 'calc(100% + 36px)' }}
        />
        <VwsSmartLine
          orientation="vertical"
          offsetStart="26px"
          offsetEnd="26px"
          className="hidden lg:block absolute left-2/3 z-10"
          style={{ top: '-18px', height: 'calc(100% + 36px)' }}
        />

        {securityLayers.map((layer, idx) => {
          const isMdLeft = idx % 2 === 0;
          const lgCol = idx % 3;

          return (
            <div
              key={layer.id}
              className="vws-grid-cell p-5 flex flex-col justify-between hover:bg-slate-900/90 transition-colors"
            >
              {/* Mobile single-column row divider */}
              {idx > 0 && <VwsTopLine bleedPx={18} className="md:hidden" />}

              {/* Tablet 2-column continuous row divider */}
              {idx >= 2 && (
                <VwsSmartLine
                  orientation="horizontal"
                  offsetStart={isMdLeft ? '26px' : '0px'}
                  offsetEnd={isMdLeft ? '0px' : '26px'}
                  className="hidden md:block lg:hidden absolute top-0 z-10"
                  style={{
                    left: isMdLeft ? '-18px' : '0px',
                    right: isMdLeft ? '0px' : '-18px',
                  }}
                />
              )}

              {/* Desktop 3-column continuous row divider */}
              {idx >= 3 && (
                <VwsSmartLine
                  orientation="horizontal"
                  offsetStart={lgCol === 0 ? '26px' : '0px'}
                  offsetEnd={lgCol === 2 ? '26px' : '0px'}
                  className="hidden lg:block absolute top-0 z-10"
                  style={{
                    left: lgCol === 0 ? '-18px' : '0px',
                    right: lgCol === 2 ? '-18px' : '0px',
                  }}
                />
              )}

              <div>
                <div className={`flex items-center gap-2 ${layer.iconColor} mb-1.5`}>
                  {layer.icon}
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {layer.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{layer.description}</p>
              </div>

              <div className="mt-4">
                <VwsRowDivider className="mb-2.5" />
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{layer.metricLabel}</span>
                  <span className={layer.metricClass}>{layer.metricValue}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Anti-Cheat Testing Sandbox */}
      <div className="relative bg-slate-900/90 p-5">
        <VwsGridFrame hasBackground overhangPx={16} bleedPx={16} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
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
        <VwsRowDivider className="mb-4" />

        {testNotification && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{testNotification}</span>
          </div>
        )}

        <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-slate-950/60">
          <VwsGridFrame hasBackground overhangPx={12} bleedPx={12} />

          {/* Mobile 2-column continuous vertical divider */}
          <VwsSmartLine
            orientation="vertical"
            offsetStart="20px"
            offsetEnd="20px"
            className="sm:hidden absolute left-1/2 z-10"
            style={{ top: '-12px', height: 'calc(100% + 24px)' }}
          />

          {/* Tablet 3-column continuous vertical dividers */}
          <VwsSmartLine
            orientation="vertical"
            offsetStart="20px"
            offsetEnd="20px"
            className="hidden sm:block lg:hidden absolute left-1/3 z-10"
            style={{ top: '-12px', height: 'calc(100% + 24px)' }}
          />
          <VwsSmartLine
            orientation="vertical"
            offsetStart="20px"
            offsetEnd="20px"
            className="hidden sm:block lg:hidden absolute left-2/3 z-10"
            style={{ top: '-12px', height: 'calc(100% + 24px)' }}
          />

          {sandboxTests.map((test, idx) => (
            <button
              key={test.key}
              type="button"
              onClick={() => runTestVector(test.key)}
              className="vws-grid-cell p-3.5 hover:bg-slate-800/80 text-left transition-colors cursor-pointer group"
            >
              {idx > 0 && <VwsColumnDivider visibleFrom="lg" overhangPx={12} />}
              {idx >= 2 && <VwsTopLine bleed={false} className="sm:hidden" />}
              {idx >= 3 && <VwsTopLine bleed={false} className="hidden sm:block lg:hidden" />}
              <span className={`text-xs font-semibold text-slate-200 block ${test.hoverClass}`}>
                {test.title}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">{test.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security Audit Feed */}
      <div className="relative bg-slate-900/70 p-5">
        <VwsGridFrame hasBackground overhangPx={16} bleedPx={16} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
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
        <VwsRowDivider className="mb-3" />

        {/* Audit Log Entries List */}
        <div className="max-h-[380px] overflow-y-auto px-4">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Tidak ada log untuk filter yang dipilih.
            </div>
          ) : (
            filteredLogs.map((entry, idx) => {
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
                <React.Fragment key={entry.id}>
                  {idx > 0 && <VwsRowDivider />}
                  <div className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs hover:bg-slate-950/40 transition-colors">
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
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
