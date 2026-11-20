import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Globe,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Flame,
  Award,
  BookOpen
} from 'lucide-react';
import { UserProfile, WebsiteCampaign, AntiCheatLogEntry, IndonesianRegionId } from '../types';
import { IndonesiaNetworkMap } from './IndonesiaNetworkMap';
import { UserWeeklyTrendChart } from './UserWeeklyTrendChart';
import { VwsTopLine, VwsColumnDivider, VwsGridFrame, VwsRowDivider, VwsTableRowDivider } from './VwsSmartLine';
import { APP_NAME, APP_CONFIG } from '../config/appConfig';
import { wpAuthService, NetworkMapStatsResponse } from '../services/wordpressAuthService';

const DASHBOARD_POLL_INTERVAL_MS = 30_000;

interface DashboardViewProps {
  user: UserProfile;
  websites: WebsiteCampaign[];
  logs: AntiCheatLogEntry[];
  onStartSurfing: () => void;
  onOpenWebsites: () => void;
  onOpenAntiCheat: () => void;
  onOpenPricing: () => void;
  onOpenHelp?: () => void;
  onRefreshDashboardData?: () => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  websites,
  logs,
  onStartSurfing,
  onOpenWebsites,
  onOpenAntiCheat,
  onOpenPricing,
  onOpenHelp,
  onRefreshDashboardData,
}) => {
  const [mapRegion, setMapRegion] = useState<IndonesianRegionId>('nasional');
  const [liveNetworkStats, setLiveNetworkStats] = useState<NetworkMapStatsResponse | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');
  const isFetchingRef = useRef<boolean>(false);

  // Unified real-time WordPress Bridge sync (Map MySQL stats + User/Websites KPIs)
  const syncDashboardRealtime = useCallback(
    async (forceFresh = false, includeAccountKpis = true) => {
      if (wpAuthService.getConfig().authMode !== 'bridge') {
        setLiveNetworkStats(null);
        return;
      }
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsRefreshingLive(true);

      try {
        const tasks: Promise<unknown>[] = [
          wpAuthService.fetchNetworkMapStats(forceFresh).then((stats) => {
            if (stats && stats.source === 'mysql_live') {
              setLiveNetworkStats(stats);
              setLastSyncedTime(
                new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              );
            }
          }),
        ];

        if (includeAccountKpis && wpAuthService.isLiveBridgeActive() && onRefreshDashboardData) {
          tasks.push(onRefreshDashboardData().catch(() => undefined));
        }

        await Promise.all(tasks);
      } finally {
        isFetchingRef.current = false;
        setIsRefreshingLive(false);
      }
    },
    [onRefreshDashboardData]
  );

  // 30-second visibility-aware polling hook (pauses in background tabs to save 4G data)
  useEffect(() => {
    let active = true;
    const poll = (forceFresh = false, includeKpis = true) => {
      if (!active || document.visibilityState === 'hidden') return;
      syncDashboardRealtime(forceFresh, includeKpis);
    };

    // Initial immediate fetch for map stats (App already synced account KPIs on mount)
    poll(false, false);

    const intervalId = window.setInterval(() => {
      poll(false, true);
    }, DASHBOARD_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        poll(false, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncDashboardRealtime]);

  const activeWebsitesCount = websites.filter((w) => w.status === 'active').length;
  const totalAllocatedPoints = websites.reduce((acc, curr) => acc + curr.allocatedPoints, 0);
  const totalHitsDeliveredToday = websites.reduce((acc, curr) => acc + curr.hitsDeliveredToday, 0);

  const dailyProgressPercent = Math.min(
    100,
    Math.round((user.dailySurfedSeconds / user.dailyTargetSeconds) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Quick Start Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 sm:p-8 relative">
        <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>JARINGAN PERTUKARAN {APP_NAME.toUpperCase()} INDONESIA</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Sistem Anti-Cheat 6 Lapis</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Selamat Datang, {user.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Dapatkan lonjakan pengunjung organik untuk situs web Anda melalui pertukaran trafik adil sesama webmaster Indonesia. Setiap kunjungan diverifikasi bebas bot.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartSurfing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-900/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Mulai Sesi Selancar Otomatis</span>
            </button>

            <button
              onClick={onOpenWebsites}
              className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Kelola Website ({websites.length})
            </button>

            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Panduan Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Subtle Decorative Backdrop Element */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* 4 Core Quantitative Metrics — Boxed with Background (Top, Bottom, First & Last + Inner Dividers) */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-slate-900/45">
        <VwsGridFrame hasBackground overhangPx={20} bleedPx={20} />

        {/* Metric 1: Points Balance */}
        <div className="vws-grid-cell p-5 flex flex-col justify-between hover:bg-slate-900/80">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Saldo Poin {APP_NAME}</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-2">
              {user.points.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-sans text-slate-400 font-normal">Poin</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              ~Cukup untuk {Math.floor(user.points / 1.0)} kunjungan 30 detik
            </p>
          </div>

          <div className="mt-4">
            <VwsRowDivider className="mb-3" />
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={onOpenPricing}
                className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
              >
                + Top Up Poin
              </button>
              <span className="text-slate-500">IDR/QRIS</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Hits Delivered to User's Sites */}
        <div className="vws-grid-cell p-5 flex flex-col justify-between hover:bg-slate-900/80">
          <VwsColumnDivider visibleFrom="sm" overhangPx={20} />
          <VwsTopLine bleed={false} className="sm:hidden" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Kunjungan Diterima</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-2">
              {user.totalHitsReceived.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-sans text-slate-400 font-normal">Hits</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              +{totalHitsDeliveredToday} hits hari ini di seluruh situs Anda
            </p>
          </div>

          <div className="mt-4">
            <VwsRowDivider className="mb-3" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{activeWebsitesCount} situs aktif</span>
              <button
                onClick={onOpenWebsites}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                Detail →
              </button>
            </div>
          </div>
        </div>

        {/* Metric 3: Hits Given by User Surfing */}
        <div className="vws-grid-cell p-5 flex flex-col justify-between hover:bg-slate-900/80">
          <VwsColumnDivider visibleFrom="lg" overhangPx={20} />
          <VwsTopLine bleed={false} className="lg:hidden" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Kunjungan Dikirim (Selancar)</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-2">
              {user.totalHitsGiven.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-sans text-slate-400 font-normal">Situs</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {Math.floor(user.dailySurfedSeconds / 60)} menit berselancar hari ini
            </p>
          </div>

          <div className="mt-4">
            <VwsRowDivider className="mb-3" />
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>Streak: {user.streakDays} Hari</span>
              </div>
              <span className="text-slate-500">Target 30m</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Surf Ratio & Tier */}
        <div className="vws-grid-cell p-5 flex flex-col justify-between hover:bg-slate-900/80">
          <VwsColumnDivider visibleFrom="sm" overhangPx={20} />
          <VwsTopLine bleed={false} className="lg:hidden" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Rasio Selancar & Status</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-2">
              {Math.round(user.surfRatio * 100)}%{' '}
              <span className="text-xs font-sans font-normal text-slate-400">
                ({user.membership === 'gratis' ? 'Gratis' : 'VIP'})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {user.membership === 'gratis'
                ? 'Selancar 60 detik dapat 42 detik trafik'
                : 'Rasio penuh 100% tanpa potongan poin'}
            </p>
          </div>

          <div className="mt-4">
            <VwsRowDivider className="mb-3" />
            <div className="flex items-center justify-between text-xs">
              {user.membership === 'gratis' ? (
                <button
                  onClick={onOpenPricing}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                >
                  Upgrade Rasio 100% →
                </button>
              ) : (
                <span className="text-amber-400 font-semibold">VIP Aktif</span>
              )}
              <span className="text-slate-500">Tier Akun</span>
            </div>
          </div>
        </div>
      </div>

      {/* Peta Distribusi Trafik Nusantara (D3-SVG Real-Time) */}
      <IndonesiaNetworkMap
        selectedRegion={mapRegion}
        onSelectRegion={setMapRegion}
        liveNetworkStats={liveNetworkStats}
        isRefreshingLive={isRefreshingLive}
        lastSyncedTime={lastSyncedTime}
        onManualRefresh={() => syncDashboardRealtime(true, true)}
      />

      {/* 7-Day Trend Recharts Graph & Daily Goal / Anti-Cheat Cards */}
      <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
        <VwsGridFrame hasBackground={false} overhangPx={18} bleedPx={18} />
        {/* Left 2 Cols: 7-Day Trend Line (Recharts) */}
        <div className="lg:col-span-2 py-4">
          <UserWeeklyTrendChart user={user} websites={websites} />
        </div>

        {/* Right 1 Col: Daily Surfing Goal & Anti-Cheat Summary */}
        <div className="relative lg:pl-6 space-y-4 py-4">
          <VwsColumnDivider visibleFrom="lg" overhangPx={18} />
          {/* Daily Goal Card */}
          <div className="relative bg-slate-900/60 p-5">
            <VwsGridFrame hasBackground overhangPx={12} bleedPx={12} />
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>Target Selancar Harian</span>
              <span className="font-mono tabular-nums text-emerald-400">
                {dailyProgressPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-none bg-slate-800 overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 rounded-none transition-all duration-500"
                style={{ width: `${dailyProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>{Math.floor(user.dailySurfedSeconds / 60)} menit selesai</span>
              <span>Target: {Math.floor(user.dailyTargetSeconds / 60)} menit</span>
            </div>

            <VwsRowDivider className="mt-4 mb-3" />
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Bonus +50 Poin harian setelah mencapai 30 menit.</span>
            </div>
          </div>

          {/* Anti-Cheat Guarantee Shield Card */}
          <div className="relative bg-slate-900/60 p-5">
            <VwsGridFrame hasBackground overhangPx={12} bleedPx={12} />
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">
                Jaminan Keadilan Poin
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Setiap poin yang Anda habiskan untuk website Anda dijamin menghasilkan tayangan manusia nyata dari pengguna yang aktif memperhatikan layar di Indonesia.
            </p>

            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Tab latar belakang otomatis dijeda</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Analisis gerakan kursor & entropi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span>
                <span>Token detak jantung anti-speedhack</span>
              </div>
            </div>

            <button
              onClick={onOpenAntiCheat}
              className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors text-center"
            >
              Buka Konsol Anti-Cheat & Log Integritas
            </button>
          </div>
        </div>
      </div>

      {/* Active Websites Snapshot Table */}
      <div className="relative bg-slate-900/60 p-5">
        <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />
        <div className="flex items-center justify-between pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Website Aktif Anda
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Status penayangan trafik situs Anda saat ini di komunitas Indonesia.
            </p>
          </div>

          <button
            onClick={onOpenWebsites}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            Lihat Semua Website →
          </button>
        </div>
        <VwsRowDivider className="mb-4" />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="pb-3 font-semibold">Judul & URL</th>
                <th className="pb-3 font-semibold">Target Wilayah</th>
                <th className="pb-3 font-semibold">Durasi</th>
                <th className="pb-3 font-semibold text-right">Hari Ini</th>
                <th className="pb-3 font-semibold text-right">Sisa Poin</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
              <VwsTableRowDivider colSpan={6} />
            </thead>
            <tbody>
              {websites.map((site, idx) => (
                <React.Fragment key={site.id}>
                  {idx > 0 && <VwsTableRowDivider colSpan={6} />}
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 max-w-xs">
                      <div className="font-semibold text-slate-200 truncate">{site.title}</div>
                      <div className="font-mono text-slate-400 truncate text-[11px]">{site.url}</div>
                    </td>
                    <td className="py-3 capitalize text-slate-300">
                      {site.targetRegion.replace('_', ' ')}
                    </td>
                    <td className="py-3 text-slate-300 font-mono">
                      {site.durationSec}s
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-slate-200">
                      {site.hitsDeliveredToday} hits
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      {site.allocatedPoints.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          site.status === 'active'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {site.status === 'active' ? 'Aktif' : 'Dijeda'}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
