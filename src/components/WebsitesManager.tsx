import React, { useState } from 'react';
import {
  Plus,
  Globe,
  Trash2,
  Pause,
  Play,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Monitor,
  Eye,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Loader2
} from 'lucide-react';
import { WebsiteCampaign, IndonesianRegionId, DeviceType, WebsiteCategory, UserProfile } from '../types';
import { INDONESIAN_REGIONS } from '../data/mockData';
import { auditWebsiteCompliance } from '../services/complianceAuditEngine';
import { wpAuthService } from '../services/wordpressAuthService';
import { APP_CONFIG, APP_NAME } from '../config/appConfig';

interface WebsitesManagerProps {
  user: UserProfile;
  websites: WebsiteCampaign[];
  onAddWebsite: (newSite: Omit<WebsiteCampaign, 'id' | 'createdAt' | 'hitsDeliveredToday' | 'totalHitsDelivered'>) => void;
  onToggleStatus: (siteId: string) => void;
  onDeleteWebsite: (siteId: string) => void;
  onAddPointsToSite: (siteId: string, amount: number) => void;
  onOpenPricing: () => void;
  onOpenAuditConsole?: () => void;
}

export const WebsitesManager: React.FC<WebsitesManagerProps> = ({
  user,
  websites,
  onAddWebsite,
  onToggleStatus,
  onDeleteWebsite,
  onAddPointsToSite,
  onOpenPricing,
  onOpenAuditConsole,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedSiteForPoints, setSelectedSiteForPoints] = useState<WebsiteCampaign | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number>(100);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState<string>('https://');
  const [category, setCategory] = useState<WebsiteCategory>('blog');
  const [durationSec, setDurationSec] = useState<number>(30);
  const [targetRegion, setTargetRegion] = useState<IndonesianRegionId>('nasional');
  const [targetDevice, setTargetDevice] = useState<DeviceType>('all');
  const [dailyLimit, setDailyLimit] = useState<number>(100);
  const [allocatedPoints, setAllocatedPoints] = useState<number>(200);
  const [referrerPolicy, setReferrerPolicy] = useState<'direct' | 'referral'>('direct');
  const [utmEnabled, setUtmEnabled] = useState<boolean>(false);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [detectedViolationKeywords, setDetectedViolationKeywords] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const calculateCostPerHit = (sec: number) => {
    switch (sec) {
      case 15:
        return 0.6;
      case 30:
        return 1.0;
      case 45:
        return 1.4;
      case 60:
        return 1.8;
      default:
        return 1.0;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDetectedViolationKeywords([]);

    if (!title.trim()) {
      setErrorMsg('Judul website wajib diisi.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setErrorMsg('URL harus diawali dengan http:// atau https://');
      return;
    }

    // 1. Instant client-side Heuristic Compliance Audit (Anti-Judi Online & Anti-18+)
    let auditResult = auditWebsiteCompliance(url, title);
    if (!auditResult.passed) {
      setErrorMsg(auditResult.reason);
      setDetectedViolationKeywords(auditResult.detectedKeywords);
      return;
    }

    if (allocatedPoints > user.points) {
      setErrorMsg(`Saldo poin Anda tidak cukup (${user.points} Poin tersedia). Beli poin atau kurangi alokasi awal.`);
      return;
    }

    // 2. Live WordPress Server Probe (wp_remote_get HTML scan + X-Frame-Options header check)
    let iframeAllowed = true;
    let auditNotes = auditResult.reason;
    let fetchedTitle = '';
    let fetchedDescription = '';

    if (wpAuthService.isLiveBridgeActive()) {
      setIsProbing(true);
      const probe = await wpAuthService.probeWebsite(url, title);
      setIsProbing(false);

      if (probe) {
        if (!probe.compliance.passed) {
          setErrorMsg(probe.compliance.reason);
          setDetectedViolationKeywords(probe.compliance.detectedKeywords || []);
          return;
        }
        auditResult = probe.compliance;
        iframeAllowed = probe.iframeAllowed;
        auditNotes = `${probe.compliance.reason} ${probe.frameReason}`.trim();
        fetchedTitle = probe.fetchedTitle || '';
        fetchedDescription = probe.fetchedDescription || '';
      }
    }

    const cost = calculateCostPerHit(durationSec);

    onAddWebsite({
      title,
      url,
      category,
      durationSec,
      targetRegion,
      targetDevice,
      pointsCostPerVisit: cost,
      dailyHitLimit: dailyLimit,
      allocatedPoints,
      status: 'active',
      iframeAllowed,
      referrerPolicy,
      utmEnabled,
      auditStatus: 'approved',
      auditScore: auditResult.riskScore,
      reportedCount: 0,
      auditNotes,
      previewContent: {
        headline: fetchedTitle || title,
        description:
          fetchedDescription ||
          `Website terdaftar di ${APP_CONFIG.fullName} kategori ${category.toUpperCase()} dengan target wilayah ${targetRegion.toUpperCase()}.`,
        author: user.name,
        city: targetRegion === 'nasional' ? 'Seluruh Nusantara' : targetRegion,
        tags: [category, `${APP_NAME} Indonesia`, 'Web Nusantara'],
        bodySnippet: 'Konten terverifikasi dan siap ditayangkan kepada ribuan peselancar aktif di seluruh Indonesia melalui jaringan pertukaran trafik aman anti-cheat.',
      },
    });

    setSuccessMsg(
      iframeAllowed
        ? 'Website lolos audit HTML & mendukung Live Iframe (kunjungan langsung tercatat Google Analytics)!'
        : 'Website lolos audit! Header X-Frame-Options terdeteksi — otomatis dialihkan ke Mode Tab Terkontrol (Hybrid) agar Google Analytics tetap mencatat kunjungan.'
    );
    setTimeout(() => {
      setIsModalOpen(false);
      setSuccessMsg('');
      setTitle('');
      setUrl('https://');
    }, 1500);
  };

  const handleTopupPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteForPoints) return;

    if (pointsToAdd > user.points) {
      alert(`Saldo tidak cukup! Anda hanya memiliki ${user.points} Poin.`);
      return;
    }

    onAddPointsToSite(selectedSiteForPoints.id, pointsToAdd);
    setSelectedSiteForPoints(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Kelola Website Anda
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftarkan situs web Anda untuk menerima ribuan pengunjung Indonesia dengan audit kepatuhan anti-judi & anti-18+.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenAuditConsole && (
            <button
              onClick={onOpenAuditConsole}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Konsol Audit Kepatuhan</span>
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Website Baru</span>
          </button>
        </div>
      </div>

      {/* Websites Grid */}
      {websites.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">
            Belum Ada Website Terdaftar
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Tambahkan URL blog, landing page, atau toko online Anda untuk mulai menerima kunjungan organik nusantara.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
          >
            Tambah Website Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {websites.map((site) => {
            const isPaused = site.status === 'paused';
            const isDepleted = site.allocatedPoints < site.pointsCostPerVisit;

            return (
              <div
                key={site.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all"
              >
                <div>
                  {/* Top Row: Title, Category, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-400 uppercase tracking-wide">
                          {site.category}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-400">
                          {site.durationSec}s per kunjungan
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 truncate mt-0.5">
                        {site.title}
                      </h3>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono truncate mt-0.5"
                      >
                        <span>{site.url.replace('https://', '')}</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </a>
                    </div>

                    {/* Status & Compliance Badges */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {site.auditStatus === 'rejected' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800 flex items-center gap-1">
                          <Ban className="w-3 h-3 text-rose-400" />
                          Ditolak (Judi/18+)
                        </span>
                      ) : site.auditStatus === 'flagged' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Karantina
                        </span>
                      ) : site.auditStatus === 'pending' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          Menunggu Audit
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Lolos Kominfo
                        </span>
                      )}

                      {isDepleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950/40 text-rose-400 border border-rose-900/40">
                          Poin Habis
                        </span>
                      ) : isPaused ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/40 text-amber-400 border border-amber-900/40">
                          Dijeda
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800">
                          {site.iframeAllowed === false ? 'Mode Tab Terkontrol' : 'Live Iframe (GA4)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target specs */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Penargetan</span>
                      <span className="text-slate-300 font-medium capitalize">
                        {site.targetRegion.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Perangkat</span>
                      <span className="text-slate-300 font-medium capitalize">
                        {site.targetDevice === 'all' ? 'Semua' : site.targetDevice}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Biaya/Kunjungan</span>
                      <span className="text-slate-300 font-medium font-mono tabular-nums">
                        {site.pointsCostPerVisit.toFixed(1)} Poin
                      </span>
                    </div>
                  </div>

                  {/* Metrics bar */}
                  <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Hari Ini</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-100">
                        {site.hitsDeliveredToday} / {site.dailyHitLimit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Total Kunjungan</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-100">
                        {site.totalHitsDelivered}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Sisa Poin Situs</span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-400">
                        {site.allocatedPoints.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleStatus(site.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      <span>{isPaused ? 'Aktifkan' : 'Jeda'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedSiteForPoints(site)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Tambah Poin</span>
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteWebsite(site.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Hapus Website"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Website Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
            <h3 className="text-base font-bold text-slate-100">
              Daftarkan Website Baru
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Situs akan langsung masuk ke rotasi penukaran trafik peselancar Indonesia.
            </p>

            {/* Compliance Policy Notice */}
            <div className="mt-3 p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300/90 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-200 block font-semibold">Kebijakan Kepatuhan Hukum Kominfo:</strong>
                Sistem secara otomatis mengaudit dan menolak website yang mengandung unsur <strong>Judi Online (slot gacor, togel, kasino)</strong> atau <strong>Konten Asusila 18+ (pornografi)</strong> sesuai UU ITE No. 1/2024 & UU No. 44/2008.
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Pendaftaran Ditolak: Pelanggaran Kepatuhan</span>
                  </div>
                  <p className="text-xs leading-relaxed text-rose-200">{errorMsg}</p>
                  {detectedViolationKeywords.length > 0 && (
                    <div className="pt-2 border-t border-rose-900/60 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-rose-400 font-medium">Kata Kunci Terlarang:</span>
                      {detectedViolationKeywords.map((kw, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 font-mono text-[10px]">
                          "{kw}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama / Judul Website
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Toko Herbal Alami Solo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Target Website
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://domainanda.com/produk"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  * Dilarang mendaftarkan situs judi online/slot, phising, atau skrip pemblokir iframe.
                </span>
              </div>

              {/* Category & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kategori Website
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WebsiteCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="blog">Blog / Artikel</option>
                    <option value="ecommerce">Toko Online / UMKM</option>
                    <option value="youtube">Video YouTube</option>
                    <option value="portfolio">Portofolio & Agensi</option>
                    <option value="education">Portal Edukasi</option>
                    <option value="news">Berita & Media</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Durasi Kunjungan
                  </label>
                  <select
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value={15}>15 Detik (0.6 Poin)</option>
                    <option value={30}>30 Detik (1.0 Poin)</option>
                    <option value={45}>45 Detik (1.4 Poin)</option>
                    <option value={60}>60 Detik (1.8 Poin)</option>
                  </select>
                </div>
              </div>

              {/* Indonesian Target Region */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Penargetan Wilayah Indonesia
                </label>
                <select
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value as IndonesianRegionId)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {INDONESIAN_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.cities})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Device & Daily Hit Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Perangkat
                  </label>
                  <select
                    value={targetDevice}
                    onChange={(e) => setTargetDevice(e.target.value as DeviceType)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="all">Semua Perangkat</option>
                    <option value="desktop">Desktop / Komputer Saja</option>
                    <option value="mobile">Smartphone / HP Saja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Batas Kunjungan / Hari
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Initial Point Allocation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Alokasikan Poin Awal untuk Situs Ini
                  </label>
                  <span className="text-xs text-slate-400">
                    Saldo Anda:{' '}
                    <strong className="text-emerald-400 font-mono tabular-nums">
                      {user.points.toLocaleString('id-ID')}
                    </strong>{' '}
                    Poin
                  </span>
                </div>
                <input
                  type="number"
                  min={50}
                  max={user.points}
                  value={allocatedPoints}
                  onChange={(e) => setAllocatedPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  ~Estimasi Kunjungan:{' '}
                  <strong className="text-slate-300 font-mono tabular-nums">
                    {Math.floor(allocatedPoints / calculateCostPerHit(durationSec))}
                  </strong>{' '}
                  pengunjung Indonesia asli.
                </span>
              </div>

              {/* Google Analytics Referrer Policy */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pelacakan Sumber di Google Analytics (GA4)
                </label>
                <select
                  value={referrerPolicy}
                  onChange={(e) => setReferrerPolicy(e.target.value as 'direct' | 'referral')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="direct">Direct (Anonim — sembunyikan asal domain pertukaran)</option>
                  <option value="referral">Referral (Tercatat datang dari trafik.velocity.web.id)</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Kunjungan membuka URL Anda secara langsung (Live Iframe / Jendela Selancar) sehingga GA4 &amp; pixel analitik tetap mencatat sesi aktif.
                </span>

                <label className="mt-2.5 flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={utmEnabled}
                    onChange={(e) => setUtmEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span>
                    Sematkan tag <code className="text-emerald-400">utm_source=trafik_id&amp;utm_medium=autosurf</code> agar terbaca rapi di laporan Akuisisi GA4
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProbing}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProbing}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  {isProbing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isProbing ? 'Memindai HTML & Header Situs...' : 'Simpan & Luncurkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topup Points to Site Modal */}
      {selectedSiteForPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">
              Tambah Poin Kunjungan
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {selectedSiteForPoints.title}
            </p>

            <form onSubmit={handleTopupPoints} className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Poin yang Ditambahkan</span>
                  <span>
                    Saldo:{' '}
                    <strong className="text-emerald-400 font-mono tabular-nums">
                      {user.points.toLocaleString('id-ID')}
                    </strong>
                  </span>
                </div>
                <input
                  type="number"
                  min={10}
                  max={user.points}
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSiteForPoints(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Tambahkan Poin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
