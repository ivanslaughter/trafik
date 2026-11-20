import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, Sparkles, Globe2, ArrowUpRight, Calendar, Info, RefreshCw } from 'lucide-react';
import { UserProfile, WebsiteCampaign } from '../types';
import { WeeklyTrendResponse } from '../services/wordpressAuthService';
import { VwsGridFrame, VwsRowDivider, VwsColumnDivider, VwsTopLine } from './VwsSmartLine';

interface UserWeeklyTrendChartProps {
  user: UserProfile;
  websites: WebsiteCampaign[];
  liveTrend?: WeeklyTrendResponse | null;
  isRefreshingLive?: boolean;
  lastSyncedTime?: string;
  onManualRefresh?: () => void;
}

interface TrendDataPoint {
  date: string;
  dayLabel: string;
  fullDate: string;
  pointsEarned: number;
  trafficDelivered: number;
  pointsSpent: number;
}

export const UserWeeklyTrendChart: React.FC<UserWeeklyTrendChartProps> = ({
  user,
  websites,
  liveTrend = null,
  isRefreshingLive = false,
  lastSyncedTime = '',
  onManualRefresh,
}) => {
  const [activeMetric, setActiveMetric] = useState<'both' | 'points' | 'traffic'>('both');
  const isLiveMysql = Boolean(liveTrend && liveTrend.source === 'mysql_live' && liveTrend.days.length > 0);

  // Use 100% real-time MySQL O(1) daily rollup when connected; demo estimate only in simulated preview
  const chartData: TrendDataPoint[] = useMemo(() => {
    if (isLiveMysql && liveTrend) {
      return liveTrend.days.map((d) => ({
        date: d.date,
        dayLabel: d.dayLabel,
        fullDate: d.fullDate,
        pointsEarned: Number(d.pointsEarned) || 0,
        trafficDelivered: Number(d.trafficDelivered) || 0,
        pointsSpent: Number(d.pointsSpent) || 0,
      }));
    }

    const days: TrendDataPoint[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const fullDayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const todayHits = websites.reduce((acc, curr) => acc + curr.hitsDeliveredToday, 0);
    const todayPoints = Math.round(user.dailySurfedSeconds / 15) + (user.streakDays > 0 ? 30 : 0);

    // Demo-only fallback factors when running without live WordPress Bridge
    const basePoints = Math.max(40, Math.round(user.points / 14));
    const baseHits = Math.max(20, Math.round(user.totalHitsReceived / 14));
    const varianceMultipliers = [0.72, 0.88, 1.15, 0.94, 1.25, 1.38, 1.0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const dayIdx = d.getDay();
      const isToday = i === 0;
      const multiplier = varianceMultipliers[6 - i];

      const pointsEarned = isToday
        ? Math.max(todayPoints, 65)
        : Math.round(basePoints * multiplier);

      const trafficDelivered = isToday
        ? Math.max(todayHits, 38)
        : Math.round(baseHits * multiplier);

      const pointsSpent = Math.round(trafficDelivered * 1.2);
      const dayLabel = isToday ? 'Hari Ini' : `${dayNames[dayIdx]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
      const fullDate = `${fullDayNames[dayIdx]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      days.push({
        date: isToday ? 'Hari Ini' : `${d.getDate()} ${monthNames[d.getMonth()]}`,
        dayLabel,
        fullDate,
        pointsEarned,
        trafficDelivered,
        pointsSpent,
      });
    }

    return days;
  }, [isLiveMysql, liveTrend, user.points, user.dailySurfedSeconds, user.streakDays, user.totalHitsReceived, websites]);

  // Aggregate stats
  const total7dPoints = useMemo(
    () => Math.round(chartData.reduce((acc, d) => acc + d.pointsEarned, 0) * 10) / 10,
    [chartData]
  );
  const total7dTraffic = useMemo(
    () => chartData.reduce((acc, d) => acc + d.trafficDelivered, 0),
    [chartData]
  );
  const averageDailyHits = Math.round(total7dTraffic / 7);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: TrendDataPoint = payload[0].payload;
      return (
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[210px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-200">{data.fullDate}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
              Verified
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-slate-300">Poin Diperoleh:</span>
              </div>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                +{data.pointsEarned.toLocaleString('id-ID')} Poin
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="text-slate-300">Trafik Terkirim:</span>
              </div>
              <span className="font-mono font-bold text-cyan-400 tabular-nums">
                {data.trafficDelivered.toLocaleString('id-ID')} Hits
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
              <span>Konsumsi Poin Kampanye:</span>
              <span className="font-mono text-slate-300">-{data.pointsSpent} Poin</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-slate-900/70 p-5 transition-all duration-200">
      <VwsGridFrame hasBackground overhangPx={12} bleedPx={12} />
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Tren 7 Hari: Perolehan Poin & Distribusi Trafik
            </h3>
            {isLiveMysql ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-none bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 font-mono font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live MySQL
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-none bg-slate-800 text-slate-300 border border-slate-700/60 font-mono font-medium">
                Mode Demo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Aktivitas berselancar (menghasilkan poin) berbanding kunjungan organik yang diterima situs web Anda
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveMetric('both')}
            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              activeMetric === 'both'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Metrik
          </button>
          <button
            onClick={() => setActiveMetric('points')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              activeMetric === 'points'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Poin</span>
          </button>
          <button
            onClick={() => setActiveMetric('traffic')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
              activeMetric === 'traffic'
                ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/50'
                : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Trafik</span>
          </button>
        </div>
      </div>
      <VwsRowDivider />

      {/* Mini Summary Stats Row — Velocity Smart-Line Grid */}
      <div className="relative grid grid-cols-2 sm:grid-cols-4 bg-slate-950/50 my-4">
        <VwsGridFrame hasBackground overhangPx={10} bleedPx={10} />
        <div className="vws-grid-cell p-3">
          <span className="text-[11px] text-slate-400 block">Total Poin 7 Hari</span>
          <div className="flex items-center gap-1 mt-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono font-bold text-emerald-400 text-base tabular-nums">
              +{total7dPoints.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="vws-grid-cell p-3">
          <VwsColumnDivider visibleFrom="always" overhangPx={10} />
          <span className="text-[11px] text-slate-400 block">Total Hits 7 Hari</span>
          <div className="flex items-center gap-1 mt-1">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-cyan-400 text-base tabular-nums">
              {total7dTraffic.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="vws-grid-cell p-3">
          <VwsColumnDivider visibleFrom="sm" overhangPx={10} />
          <VwsTopLine bleed={false} className="sm:hidden" />
          <span className="text-[11px] text-slate-400 block">Rata-rata Kunjungan/Hari</span>
          <span className="font-mono font-bold text-slate-200 text-base tabular-nums mt-1 block">
            ~{averageDailyHits} hits/hari
          </span>
        </div>

        <div className="vws-grid-cell p-3">
          <VwsColumnDivider visibleFrom="always" overhangPx={10} />
          <VwsTopLine bleed={false} className="sm:hidden" />
          <span className="text-[11px] text-slate-400 block">Status Rasio Akun</span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">
              {Math.round(user.surfRatio * 100)}% Efisiensi
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Area Container */}
      <div className="w-full h-64 sm:h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
          >
            <defs>
              {/* Gradient for Points */}
              <linearGradient id="pointsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Gradient for Traffic */}
              <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              strokeOpacity={0.4}
              vertical={false}
            />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeOpacity: 0.6 }}
              dy={6}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val.toLocaleString('id-ID')}
              dx={-4}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              formatter={(value) => {
                if (value === 'pointsEarned') return <span className="text-emerald-400 font-medium mr-3">Poin Diperoleh</span>;
                if (value === 'trafficDelivered') return <span className="text-cyan-400 font-medium">Trafik Terkirim (Hits)</span>;
                return value;
              }}
            />

            {(activeMetric === 'both' || activeMetric === 'points') && (
              <Area
                type="monotone"
                dataKey="pointsEarned"
                name="pointsEarned"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#pointsGrad)"
                activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
              />
            )}

            {(activeMetric === 'both' || activeMetric === 'traffic') && (
              <Area
                type="monotone"
                dataKey="trafficDelivered"
                name="trafficDelivered"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#trafficGrad)"
                activeDot={{ r: 6, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Notice */}
      <VwsRowDivider className="mt-3 mb-3" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {isLiveMysql
              ? 'Data agregasi harian real-time langsung dari database MySQL (diperbarui otomatis tiap 30 detik).'
              : 'Menampilkan data simulasi pratinjau. Login dengan akun WordPress Bridge untuk grafik MySQL real-time.'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 font-mono">
            {isLiveMysql
              ? lastSyncedTime
                ? `Sync: ${lastSyncedTime}`
                : 'Live MySQL'
              : 'Preview Demo'}
          </span>
          {isLiveMysql && onManualRefresh && (
            <button
              type="button"
              onClick={onManualRefresh}
              disabled={isRefreshingLive}
              title="Segarkan grafik tren 7 hari dari MySQL"
              className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
