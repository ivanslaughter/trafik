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
  Loader2,
  Pencil,
  Wifi,
  XCircle
} from 'lucide-react';
import { WebsiteCampaign, IndonesianRegionId, DeviceType, WebsiteCategory, UserProfile } from '../types';
import { INDONESIAN_REGIONS } from '../data/mockData';
import { auditWebsiteCompliance } from '../services/complianceAuditEngine';
import { wpAuthService } from '../services/wordpressAuthService';
import { APP_CONFIG, APP_NAME } from '../config/appConfig';
import { VwsRowDivider, VwsBottomLine, VwsTopLine, VwsGridFrame, VwsSmartLine, VwsColumnDivider } from './VwsSmartLine';
import {
  ClientUrlValidationResult,
  validateWebsiteUrlClientSide,
} from '../utils/urlValidator';

interface WebsitesManagerProps {
  user: UserProfile;
  websites: WebsiteCampaign[];
  onAddWebsite: (newSite: Omit<WebsiteCampaign, 'id' | 'createdAt' | 'hitsDeliveredToday' | 'totalHitsDelivered'>) => void;
  onUpdateWebsite?: (siteId: string, updates: Partial<WebsiteCampaign>) => Promise<{ ok: boolean; error?: string }> | void;
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
  onUpdateWebsite,
  onToggleStatus,
  onDeleteWebsite,
  onAddPointsToSite,
  onOpenPricing,
  onOpenAuditConsole,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSite, setEditingSite] = useState<WebsiteCampaign | null>(null);
  const [selectedSiteForPoints, setSelectedSiteForPoints] = useState<WebsiteCampaign | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState<number>(100);
  const [topupError, setTopupError] = useState<string>('');

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
  const [isCheckingUrl, setIsCheckingUrl] = useState<boolean>(false);
  const [urlValidation, setUrlValidation] = useState<ClientUrlValidationResult | null>(null);
  const [validatedSnapshotKey, setValidatedSnapshotKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [detectedViolationKeywords, setDetectedViolationKeywords] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const getExistingOtherUrls = () =>
    websites
      .filter((s) => !editingSite || s.id !== editingSite.id)
      .map((s) => s.url);

  const openCreateModal = () => {
    setEditingSite(null);
    setTitle('');
    setUrl('https://');
    setCategory('blog');
    setDurationSec(30);
    setTargetRegion('nasional');
    setTargetDevice('all');
    setDailyLimit(100);
    setAllocatedPoints(Math.min(200, Math.max(50, user.points)));
    setReferrerPolicy('direct');
    setUtmEnabled(false);
    setUrlValidation(null);
    setValidatedSnapshotKey('');
    setErrorMsg('');
    setDetectedViolationKeywords([]);
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (site: WebsiteCampaign) => {
    setEditingSite(site);
    setTitle(site.title);
    setUrl(site.url);
    setCategory(site.category);
    setDurationSec(site.durationSec);
    setTargetRegion(site.targetRegion);
    setTargetDevice(site.targetDevice);
    setDailyLimit(site.dailyHitLimit);
    setAllocatedPoints(site.allocatedPoints);
    setReferrerPolicy(site.referrerPolicy || 'direct');
    setUtmEnabled(Boolean(site.utmEnabled));
    setUrlValidation(null);
    setValidatedSnapshotKey('');
    setErrorMsg('');
    setDetectedViolationKeywords([]);
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const closeFormModal = () => {
    if (isProbing || isCheckingUrl) return;
    setIsModalOpen(false);
    setEditingSite(null);
    setUrlValidation(null);
    setValidatedSnapshotKey('');
    setErrorMsg('');
    setDetectedViolationKeywords([]);
    setSuccessMsg('');
  };

  const handleUrlInputChange = (nextUrl: string) => {
    setUrl(nextUrl);
    setValidatedSnapshotKey('');
    if (urlValidation) {
      setUrlValidation(null);
    }
  };

  const handleCheckUrlClientSide = async (): Promise<ClientUrlValidationResult> => {
    setErrorMsg('');
    setDetectedViolationKeywords([]);
    setIsCheckingUrl(true);

    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();

    // Show immediate checking state for reachability once syntax & policy pass
    const quickCheck = await validateWebsiteUrlClientSide(trimmedUrl, trimmedTitle, {
      checkReachability: false,
      existingUrls: getExistingOtherUrls(),
    });

    if (!quickCheck.isValid) {
      setUrlValidation(quickCheck);
      setIsCheckingUrl(false);
      setErrorMsg(quickCheck.errorMessage);
      setDetectedViolationKeywords(quickCheck.detectedKeywords);
      return quickCheck;
    }

    setUrlValidation({
      ...quickCheck,
      reachability: {
        status: 'checking',
        method: 'HEAD',
        message: `Mengirim permintaan HTTP HEAD via API ke ${quickCheck.hostname}...`,
      },
    });

    const fullResult = await validateWebsiteUrlClientSide(trimmedUrl, trimmedTitle, {
      checkReachability: true,
      existingUrls: getExistingOtherUrls(),
    });

    setUrlValidation(fullResult);
    setIsCheckingUrl(false);

    if (fullResult.isValid) {
      setValidatedSnapshotKey(`${trimmedUrl}||${trimmedTitle}`);
    } else {
      setErrorMsg(fullResult.errorMessage);
      setDetectedViolationKeywords(fullResult.detectedKeywords);
    }

    return fullResult;
  };

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setDetectedViolationKeywords([]);

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedTitle) {
      setErrorMsg('Judul website wajib diisi.');
      return;
    }

    if (!editingSite && allocatedPoints > user.points) {
      setErrorMsg(`Saldo poin Anda tidak cukup (${user.points} Poin tersedia). Beli poin atau kurangi alokasi awal.`);
      return;
    }

    // 1. Client-side 3-Stage URL Validation (Valid Domain + Content Policy + Reachability)
    const snapshotKey = `${trimmedUrl}||${trimmedTitle}`;
    const isUnchangedEditUrl = Boolean(editingSite && trimmedUrl === editingSite.url);
    let clientValidation: ClientUrlValidationResult;

    if (urlValidation?.isValid && validatedSnapshotKey === snapshotKey) {
      clientValidation = urlValidation;
    } else if (isUnchangedEditUrl) {
      // Editing metadata (e.g. duration/region/title) without changing URL: validate domain & content policy
      clientValidation = await validateWebsiteUrlClientSide(trimmedUrl, trimmedTitle, {
        checkReachability: false,
        existingUrls: getExistingOtherUrls(),
      });
      setUrlValidation(clientValidation);
      if (!clientValidation.isValid) {
        setErrorMsg(clientValidation.errorMessage);
        setDetectedViolationKeywords(clientValidation.detectedKeywords);
        return;
      }
    } else {
      clientValidation = await handleCheckUrlClientSide();
      if (!clientValidation.isValid) {
        return;
      }
    }

    let auditResult =
      clientValidation.policy.audit || auditWebsiteCompliance(clientValidation.normalizedUrl, trimmedTitle);
    if (!auditResult.passed) {
      setErrorMsg(auditResult.reason);
      setDetectedViolationKeywords(auditResult.detectedKeywords);
      return;
    }

    const finalUrl = clientValidation.normalizedUrl || trimmedUrl;
    const cost = calculateCostPerHit(durationSec);
    const shouldProbe =
      wpAuthService.isLiveBridgeActive() &&
      (!editingSite || finalUrl !== editingSite.url || trimmedTitle !== editingSite.title);

    // 2. Live WordPress Server Probe (wp_remote_get HTML scan + X-Frame-Options header check)
    let iframeAllowed = editingSite ? editingSite.iframeAllowed !== false : true;
    let auditNotes = editingSite ? editingSite.auditNotes || auditResult.reason : auditResult.reason;
    let fetchedTitle = '';
    let fetchedDescription = '';

    if (shouldProbe) {
      setIsProbing(true);
      const probe = await wpAuthService.probeWebsite(finalUrl, trimmedTitle);
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

    if (editingSite && onUpdateWebsite) {
      setIsProbing(true);
      const updateResult = await onUpdateWebsite(editingSite.id, {
        title: trimmedTitle,
        url: finalUrl,
        category,
        durationSec,
        targetRegion,
        targetDevice,
        pointsCostPerVisit: cost,
        dailyHitLimit: dailyLimit,
        iframeAllowed,
        referrerPolicy,
        utmEnabled,
        auditStatus: 'approved',
        auditScore: auditResult.riskScore,
        auditNotes,
        previewContent: {
          headline: fetchedTitle || trimmedTitle,
          description:
            fetchedDescription ||
            editingSite.previewContent?.description ||
            `Website terdaftar di ${APP_CONFIG.fullName} kategori ${category.toUpperCase()} dengan target wilayah ${targetRegion.toUpperCase()}.`,
          author: editingSite.previewContent?.author || user.name,
          city: targetRegion === 'nasional' ? 'Seluruh Nusantara' : targetRegion,
          tags: [category, `${APP_NAME} Indonesia`, 'Web Nusantara'],
          bodySnippet:
            editingSite.previewContent?.bodySnippet ||
            'Konten terverifikasi dan siap ditayangkan kepada ribuan peselancar aktif di seluruh Indonesia melalui jaringan pertukaran trafik aman anti-cheat.',
        },
      });
      setIsProbing(false);

      if (updateResult && !updateResult.ok) {
        setErrorMsg(updateResult.error || 'Gagal menyimpan perubahan website.');
        return;
      }

      setSuccessMsg('Perubahan pengaturan website berhasil disimpan & langsung aktif di rotasi!');
      setTimeout(() => {
        setIsModalOpen(false);
        setEditingSite(null);
        setUrlValidation(null);
        setValidatedSnapshotKey('');
        setSuccessMsg('');
      }, 1100);
      return;
    }

    onAddWebsite({
      title: trimmedTitle,
      url: finalUrl,
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
        headline: fetchedTitle || trimmedTitle,
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
      setTopupError(`Saldo tidak cukup! Anda hanya memiliki ${user.points.toLocaleString('id-ID')} Poin.`);
      return;
    }

    setTopupError('');
    onAddPointsToSite(selectedSiteForPoints.id, pointsToAdd);
    setSelectedSiteForPoints(null);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <VwsBottomLine bleedPx={16} />
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
            onClick={openCreateModal}
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
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
          >
            Tambah Website Pertama
          </button>
        </div>
      ) : (
        <div
          className={`relative grid grid-cols-1 ${
            websites.length > 1 ? 'lg:grid-cols-2' : ''
          } bg-slate-900/70`}
        >
          <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />
          {websites.length > 1 && (
            <VwsSmartLine
              orientation="vertical"
              offsetStart="26px"
              offsetEnd="26px"
              className="hidden lg:block absolute left-1/2 z-10"
              style={{ top: '-18px', height: 'calc(100% + 36px)' }}
            />
          )}
          {websites.map((site, siteIdx) => {
            const isPaused = site.status === 'paused';
            const isDepleted = site.allocatedPoints < site.pointsCostPerVisit;
            const isLeftCol = siteIdx % 2 === 0;

            return (
              <div
                key={site.id}
                className="vws-grid-cell p-5 sm:p-6 flex flex-col justify-between hover:bg-slate-900/90 transition-colors"
              >
                {/* Mobile single-column row divider */}
                {siteIdx > 0 && (
                  <VwsTopLine bleedPx={18} className="lg:hidden" />
                )}
                {/* Desktop 2-column continuous row divider with outer fade bleed */}
                {siteIdx >= 2 && (
                  <VwsSmartLine
                    orientation="horizontal"
                    offsetStart={isLeftCol ? '26px' : '0px'}
                    offsetEnd={isLeftCol ? '0px' : '26px'}
                    className="hidden lg:block absolute top-0 z-10"
                    style={{
                      left: isLeftCol ? '-18px' : '0px',
                      right: isLeftCol ? '0px' : '-18px',
                    }}
                  />
                )}
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
                  <VwsRowDivider className="mt-4 mb-3" />
                  <div className="grid grid-cols-3 gap-2 text-xs">
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
                  <div className="relative mt-4 bg-slate-950/60 grid grid-cols-3 text-center text-xs">
                    <VwsGridFrame hasBackground overhangPx={8} bleedPx={8} />
                    <div className="vws-grid-cell p-3">
                      <span className="text-slate-500 block text-[11px]">Hari Ini</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-100">
                        {site.hitsDeliveredToday} / {site.dailyHitLimit}
                      </span>
                    </div>
                    <div className="vws-grid-cell p-3">
                      <VwsColumnDivider visibleFrom="always" overhangPx={8} />
                      <span className="text-slate-500 block text-[11px]">Total Kunjungan</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-100">
                        {site.totalHitsDelivered}
                      </span>
                    </div>
                    <div className="vws-grid-cell p-3">
                      <VwsColumnDivider visibleFrom="always" overhangPx={8} />
                      <span className="text-slate-500 block text-[11px]">Sisa Poin Situs</span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-400">
                        {site.allocatedPoints.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <VwsRowDivider className="mt-4 mb-3" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => onToggleStatus(site.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      <span>{isPaused ? 'Aktifkan' : 'Jeda'}</span>
                    </button>

                    {onUpdateWebsite && (
                      <button
                        onClick={() => openEditModal(site)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit judul, URL, durasi, target, atau pengaturan GA4"
                      >
                        <Pencil className="w-3 h-3 text-cyan-400" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setTopupError('');
                        setSelectedSiteForPoints(site);
                      }}
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
          {websites.length > 2 && websites.length % 2 === 1 && (
            <div aria-hidden="true" className="hidden lg:block relative">
              <VwsSmartLine
                orientation="horizontal"
                offsetStart="0px"
                offsetEnd="26px"
                className="absolute top-0 z-10"
                style={{ left: '0px', right: '-18px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Website Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
            <h3 className="text-base font-bold text-slate-100">
              {editingSite ? 'Edit Pengaturan Website' : 'Daftarkan Website Baru'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {editingSite
                ? 'Ubah judul, URL target, durasi, wilayah, perangkat, batas harian, atau pelacakan GA4 tanpa kehilangan statistik kunjungan.'
                : 'Situs akan langsung masuk ke rotasi penukaran trafik peselancar Indonesia.'}
            </p>

            {/* Compliance Policy Notice */}
            <div className="mt-3 p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300/90 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-200 block font-semibold">Kebijakan Kepatuhan Hukum Kominfo:</strong>
                Sistem secara otomatis mengaudit dan menolak website yang mengandung unsur <strong>Judi Online (slot gacor, togel, kasino)</strong> atau <strong>Konten Asusila 18+ (pornografi)</strong> sesuai UU ITE No. 1/2024 & UU No. 44/2008.
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>
                      {detectedViolationKeywords.length > 0
                        ? editingSite
                          ? 'Perubahan Ditolak: Pelanggaran Kebijakan Konten'
                          : 'Pendaftaran Ditolak: Pelanggaran Kebijakan Konten'
                        : 'Validasi URL Gagal'}
                    </span>
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
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setValidatedSnapshotKey('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* URL Input with Client-Side Validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    URL Target Website
                  </label>
                  <button
                    type="button"
                    onClick={handleCheckUrlClientSide}
                    disabled={isCheckingUrl || isProbing || !url.trim() || url.trim() === 'https://'}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-700/60 bg-emerald-950/60 hover:bg-emerald-900/60 disabled:opacity-50 text-[11px] font-medium text-emerald-300 transition-colors cursor-pointer"
                  >
                    {isCheckingUrl ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wifi className="w-3 h-3" />
                    )}
                    <span>{isCheckingUrl ? 'Memeriksa URL...' : 'Validasi & Cek URL'}</span>
                  </button>
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://domainanda.com/produk"
                  value={url}
                  onChange={(e) => handleUrlInputChange(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none transition-colors ${
                    urlValidation
                      ? urlValidation.isValid
                        ? 'border-emerald-600/80 focus:border-emerald-500'
                        : 'border-rose-700/80 focus:border-rose-500'
                      : 'border-slate-800 focus:border-emerald-500'
                  }`}
                />

                {/* 3-Point Client-Side URL Validation Status Panel */}
                {urlValidation && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-2">
                      {urlValidation.domain.status === 'pass' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">Domain Valid: </span>
                        <span className={urlValidation.domain.status === 'pass' ? 'text-emerald-300/90' : 'text-rose-300'}>
                          {urlValidation.domain.message}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      {urlValidation.policy.status === 'pass' ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">Kebijakan Konten: </span>
                        <span className={urlValidation.policy.status === 'pass' ? 'text-emerald-300/90' : 'text-rose-300'}>
                          {urlValidation.policy.message}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      {urlValidation.reachability.status === 'checking' ? (
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                      ) : urlValidation.reachability.status === 'pass' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : urlValidation.reachability.status === 'fail' ? (
                        <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-200">Status HTTP (HEAD):</span>
                        {typeof urlValidation.reachability.statusCode === 'number' &&
                          urlValidation.reachability.statusCode > 0 && (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                urlValidation.reachability.statusCode === 200
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                  : 'bg-rose-950 text-rose-300 border-rose-700/60'
                              }`}
                            >
                              {urlValidation.reachability.statusCode}{' '}
                              {urlValidation.reachability.statusText || ''}
                            </span>
                          )}
                        <span
                          className={
                            urlValidation.reachability.status === 'pass'
                              ? 'text-emerald-300/90'
                              : urlValidation.reachability.status === 'fail'
                              ? 'text-rose-300'
                              : urlValidation.reachability.status === 'checking'
                              ? 'text-cyan-300'
                              : 'text-slate-400'
                          }
                        >
                          {urlValidation.reachability.message}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <span className="text-[11px] text-slate-500 mt-1 block">
                  * Sistem memvalidasi format domain, kepatuhan anti-judi/18+, dan mengirim permintaan HTTP HEAD via API untuk memastikan status <strong className="text-slate-300">200 OK</strong> sebelum disimpan.
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

              {/* Initial Point Allocation (Create) or Existing Point Summary (Edit) */}
              {editingSite ? (
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">Sisa Poin Situs Saat Ini</span>
                    <span className="text-[11px] text-slate-500">
                      Gunakan tombol <strong className="text-slate-300">Tambah Poin</strong> di kartu untuk menambah saldo situs.
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="font-mono font-bold text-emerald-400 tabular-nums block">
                      {editingSite.allocatedPoints.toLocaleString('id-ID')} Poin
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      ~{Math.floor(editingSite.allocatedPoints / calculateCostPerHit(durationSec))} kunjungan
                    </span>
                  </div>
                </div>
              ) : (
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
              )}

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
                  onClick={closeFormModal}
                  disabled={isProbing || isCheckingUrl}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProbing || isCheckingUrl}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5"
                >
                  {(isProbing || isCheckingUrl) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isCheckingUrl
                      ? 'Memvalidasi URL & Jangkauan...'
                      : isProbing
                      ? 'Memindai & Menyimpan...'
                      : editingSite
                      ? 'Simpan Perubahan'
                      : 'Simpan & Luncurkan'}
                  </span>
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
              {topupError && (
                <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
                  {topupError}
                </div>
              )}

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
                  onClick={() => {
                    setTopupError('');
                    setSelectedSiteForPoints(null);
                  }}
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
