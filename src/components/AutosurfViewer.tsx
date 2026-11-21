import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  ShieldCheck,
  ShieldAlert,
  Volume2,
  VolumeX,
  ExternalLink,
  Flag,
  Smartphone,
  Monitor,
  RefreshCw,
  Lock,
  CheckCircle2,
  Layers,
  Globe,
  Wifi,
  AppWindow,
  MapPin,
} from 'lucide-react';
import {
  WebsiteCampaign,
  UserProfile,
  AntiCheatStatus,
  AntiCheatLogEntry,
  GeoStatus,
  SurfDeliveryMode,
} from '../types';
import { antiCheatEngine } from '../services/antiCheatEngine';
import { HumanVerificationModal } from './HumanVerificationModal';
import { PAYMENTS_ENABLED } from '../config/appConfig';

interface AutosurfViewerProps {
  user: UserProfile;
  websites: WebsiteCampaign[];
  geoStatus?: GeoStatus | null;
  onAwardPoints: (points: number, siteTitle: string) => void;
  onDeductSitePoints: (siteId: string, points: number) => void;
  onOpenPricing: () => void;
  onReportWebsite?: (siteId: string, reason: string) => void;
}

function detectInitialLite4G(): boolean {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('tn_lite_4g');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  }
  if (typeof navigator !== 'undefined') {
    const navConn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (navConn?.saveData) return true;
    if (
      navConn?.effectiveType &&
      ['slow-2g', '2g', '3g'].includes(navConn.effectiveType)
    ) {
      return true;
    }
  }
  return false;
}

function buildVisitUrl(site: WebsiteCampaign): string {
  if (!site.utmEnabled) return site.url;
  try {
    const parsed = new URL(site.url);
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', 'trafik_id');
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', 'autosurf');
    }
    if (!parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', 'nusantara_exchange');
    }
    return parsed.toString();
  } catch {
    return site.url;
  }
}

export const AutosurfViewer: React.FC<AutosurfViewerProps> = ({
  user,
  websites,
  geoStatus,
  onAwardPoints,
  onDeductSitePoints,
  onOpenPricing,
  onReportWebsite,
}) => {
  const [lite4gMode, setLite4gMode] = useState<boolean>(detectInitialLite4G);
  const [deliveryMode, setDeliveryMode] = useState<SurfDeliveryMode>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('tn_surf_delivery_mode');
      if (saved === 'auto' || saved === 'iframe' || saved === 'window') {
        return saved;
      }
    }
    return 'auto';
  });

  // Only surf websites that passed compliance audit and have remaining points
  // When Lite 4G Mode is active, prioritize mobile-ready & shorter-duration targets
  const approvedSites = useMemo(() => {
    const eligible = websites.filter(
      (w) =>
        w.auditStatus === 'approved' &&
        w.status === 'active' &&
        w.allocatedPoints >= w.pointsCostPerVisit
    );

    if (!lite4gMode) return eligible;

    return [...eligible].sort((a, b) => {
      const scoreA =
        (a.targetDevice === 'mobile' ? 2 : a.targetDevice === 'all' ? 1 : 0) +
        (a.durationSec <= 30 ? 1 : 0);
      const scoreB =
        (b.targetDevice === 'mobile' ? 2 : b.targetDevice === 'all' ? 1 : 0) +
        (b.durationSec <= 30 ? 1 : 0);
      return scoreB - scoreA;
    });
  }, [websites, lite4gMode]);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [visitNonce, setVisitNonce] = useState<number>(1);
  const [remainingSec, setRemainingSec] = useState<number>(30);
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<string>('');
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
  );
  const [showChallenge, setShowChallenge] = useState<boolean>(false);
  const [challengeReason, setChallengeReason] = useState<string>('');
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [sessionPointsEarned, setSessionPointsEarned] = useState<number>(0);
  const [sessionHitsCompleted, setSessionHitsCompleted] = useState<number>(0);

  // RankBoostUp Managed Single Surf Window + Iframe Hybrid State
  const [forcedWindowSiteIds, setForcedWindowSiteIds] = useState<Record<string, boolean>>({});
  const [surfWindowAlive, setSurfWindowAlive] = useState<boolean>(false);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const surfWindowRef = useRef<Window | null>(null);

  // Anti-cheat live telemetry
  const [antiCheatStatus, setAntiCheatStatus] = useState<AntiCheatStatus>(
    antiCheatEngine.getStatus()
  );

  const isGeoBlocked = Boolean(geoStatus && !geoStatus.allowed && !geoStatus.adminBypass);

  const safeIdx = approvedSites.length > 0 ? currentIdx % approvedSites.length : 0;
  const currentSite = approvedSites[safeIdx];
  const visitUrl = currentSite ? buildVisitUrl(currentSite) : '';

  const useManagedWindow = useMemo(() => {
    if (!currentSite) return false;
    if (deliveryMode === 'window') return true;
    if (deliveryMode === 'iframe') return Boolean(forcedWindowSiteIds[currentSite.id]);
    return currentSite.iframeAllowed === false || Boolean(forcedWindowSiteIds[currentSite.id]);
  }, [currentSite, deliveryMode, forcedWindowSiteIds]);

  const timerRef = useRef<number | null>(null);
  const showChallengeRef = useRef<boolean>(showChallenge);
  showChallengeRef.current = showChallenge;
  const useManagedWindowRef = useRef<boolean>(useManagedWindow);
  useManagedWindowRef.current = useManagedWindow;

  const toggleLite4G = () => {
    setLite4gMode((prev) => {
      const next = !prev;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tn_lite_4g', String(next));
      }
      return next;
    });
  };

  const changeDeliveryMode = (mode: SurfDeliveryMode) => {
    setDeliveryMode(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tn_surf_delivery_mode', mode);
    }
    if (mode === 'iframe') {
      closeManagedSurfWindow();
    }
  };

  // Sync paused state to anti-cheat engine
  useEffect(() => {
    antiCheatEngine.setSurfPaused(isPaused || showChallenge || isGeoBlocked);
  }, [isPaused, showChallenge, isGeoBlocked]);

  // Initialize anti-cheat engine strictly while Surf Mode is active & allowed
  useEffect(() => {
    if (isGeoBlocked) {
      antiCheatEngine.stopSurfing();
      return;
    }

    const unsubscribe = antiCheatEngine.subscribe((entry: AntiCheatLogEntry) => {
      setAntiCheatStatus(antiCheatEngine.getStatus());

      if (entry.type === 'VISIBILITY_LOST') {
        setIsPaused(true);
        setPauseReason(
          'Tab browser di latar belakang. Kunjungan dijeda untuk memastikan tayangan asli.'
        );
      } else if (entry.type === 'VISIBILITY_RESTORED') {
        if (!showChallengeRef.current) {
          setIsPaused(false);
          setPauseReason('');
        }
      } else if (entry.type === 'LOW_ENTROPY_DETECTED') {
        setIsPaused(true);
        setPauseReason(
          'Aktivitas kursor nol terdeteksi. Silakan selesaikan pemeriksaan kehadiran.'
        );
        setChallengeReason('Deteksi Tidak Ada Aktivitas (AFK / Bot)');
        setShowChallenge(true);
      } else if (entry.type === 'CONCURRENCY_LOCKED') {
        setIsPaused(true);
        setPauseReason(
          'Sesi ganda terdeteksi. Tutup tab selancar lain untuk melanjutkan.'
        );
      }
    });

    antiCheatEngine.startSurfing();
    setAntiCheatStatus(antiCheatEngine.getStatus());

    return () => {
      unsubscribe();
      antiCheatEngine.setExternalSurfWindowActive(false);
      antiCheatEngine.stopSurfing();
    };
  }, [isGeoBlocked]);

  // Poll managed RankBoostUp surf window health so focus shifts to that window
  // don't falsely trigger VISIBILITY_LOST, while closing it early pauses the countdown.
  useEffect(() => {
    const checkWindowInterval = window.setInterval(() => {
      const win = surfWindowRef.current;
      const alive = Boolean(win && !win.closed);

      setSurfWindowAlive((prev) => {
        if (prev && !alive && useManagedWindowRef.current) {
          setIsPaused(true);
          setPauseReason(
            'Jendela selancar eksternal ditutup. Klik "Buka Jendela Selancar (1x)" untuk melanjutkan.'
          );
        }
        return alive;
      });

      antiCheatEngine.setExternalSurfWindowActive(alive && useManagedWindowRef.current);
      if (!alive && win?.closed) {
        surfWindowRef.current = null;
      }
    }, 1000);

    return () => window.clearInterval(checkWindowInterval);
  }, []);

  // Sync current site duration & rotate existing RankBoostUp window if active
  useEffect(() => {
    if (!currentSite) return;

    setTargetDuration(currentSite.durationSec);
    setRemainingSec(currentSite.durationSec);
    setIframeLoaded(false);

    const targetUrl = buildVisitUrl(currentSite);
    if (useManagedWindow && surfWindowRef.current && !surfWindowRef.current.closed) {
      try {
        surfWindowRef.current.location.href = targetUrl;
        setSurfWindowAlive(true);
        antiCheatEngine.setExternalSurfWindowActive(true);
      } catch {
        // Ignore cross-origin assign exception if restricted
      }
    }

    const loadTimeout = window.setTimeout(() => setIframeLoaded(true), lite4gMode ? 2200 : 3800);
    return () => window.clearTimeout(loadTimeout);
  }, [safeIdx, visitNonce, currentSite?.id, useManagedWindow, lite4gMode]);

  // If managed window is required but not open yet, pause cleanly until user launches 1x window
  useEffect(() => {
    if (useManagedWindow && !surfWindowAlive && !isGeoBlocked) {
      setIsPaused(true);
      setPauseReason(
        'Klik "Buka Jendela Selancar (1x)" agar situs ini dimuat penuh dan Google Analytics mencatat kunjungan.'
      );
    } else if (!useManagedWindow && pauseReason.includes('Jendela')) {
      setIsPaused(false);
      setPauseReason('');
    }
  }, [useManagedWindow, surfWindowAlive, isGeoBlocked]);

  const playChime = (type: 'success' | 'alert') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // AudioContext muted or unavailable
    }
  };

  // Main countdown loop with anti-cheat heartbeat verification
  useEffect(() => {
    if (isPaused || showChallenge || isGeoBlocked || !currentSite) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      if (currentSite && remainingSec % 4 === 0) {
        const { valid } = antiCheatEngine.generateProofOfSurfHeartbeat(currentSite.id);
        if (!valid) {
          setIsPaused(true);
          setPauseReason(
            'Pemeriksaan heartbeat integritas gagal. Menjaga distribusi poin adil.'
          );
          return;
        }
      }

      setRemainingSec((prev) => {
        if (prev <= 1) {
          handleSiteCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, showChallenge, isGeoBlocked, currentSite, remainingSec]);

  const handleSiteCompletion = () => {
    if (!currentSite) return;

    const earned = currentSite.pointsCostPerVisit * user.surfRatio;
    onAwardPoints(earned, currentSite.title);
    onDeductSitePoints(currentSite.id, currentSite.pointsCostPerVisit);

    setSessionPointsEarned((prev) => prev + earned);
    setSessionHitsCompleted((prev) => prev + 1);

    antiCheatEngine.recordPointCredit(earned, currentSite.title);
    playChime('success');

    if ((sessionHitsCompleted + 1) % 5 === 0) {
      setIsPaused(true);
      setChallengeReason('Pemeriksaan Kehadiran Rutin (Setiap 5 Kunjungan)');
      setShowChallenge(true);
      return;
    }

    if (autoAdvance) {
      nextSite();
    } else {
      setIsPaused(true);
      setPauseReason('Kunjungan selesai. Klik Lewati/Lanjut atau aktifkan Putar Otomatis.');
    }
  };

  const nextSite = () => {
    if (approvedSites.length === 0) return;
    const nextIndex = (safeIdx + 1) % approvedSites.length;
    setCurrentIdx(nextIndex);
    setVisitNonce((n) => n + 1);
    const nextSiteObj = approvedSites[nextIndex];
    if (nextSiteObj) {
      setTargetDuration(nextSiteObj.durationSec);
      setRemainingSec(nextSiteObj.durationSec);
      setIsPaused(false);
      setPauseReason('');
      setIframeLoaded(false);
    }
  };

  const openManagedSurfWindow = (targetUrl: string, markForcedForCurrent = false) => {
    if (markForcedForCurrent && currentSite) {
      setForcedWindowSiteIds((prev) => ({ ...prev, [currentSite.id]: true }));
    }

    setPopupBlocked(false);
    const isNarrowMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const features = isNarrowMobile
      ? ''
      : 'width=1160,height=740,menubar=yes,toolbar=yes,location=yes,scrollbars=yes,resizable=yes';

    try {
      const opened = window.open(targetUrl, 'trafik_surf_window', features || undefined);
      if (opened) {
        surfWindowRef.current = opened;
        setSurfWindowAlive(true);
        antiCheatEngine.setExternalSurfWindowActive(true);
        setIsPaused(false);
        setPauseReason('');
        try {
          opened.focus();
        } catch {
          // ignore focus denial
        }
      } else {
        setPopupBlocked(true);
      }
    } catch {
      setPopupBlocked(true);
    }
  };

  const closeManagedSurfWindow = () => {
    antiCheatEngine.setExternalSurfWindowActive(false);
    setSurfWindowAlive(false);
    if (surfWindowRef.current && !surfWindowRef.current.closed) {
      try {
        surfWindowRef.current.close();
      } catch {
        // ignore cross-origin close error
      }
    }
    surfWindowRef.current = null;
  };

  const handleChallengeResult = (passed: boolean) => {
    setShowChallenge(false);
    antiCheatEngine.recordHumanVerificationResult(passed);

    if (passed) {
      setIsPaused(false);
      setPauseReason('');
      if (remainingSec === 0) {
        nextSite();
      }
    } else {
      setIsPaused(true);
      setPauseReason(
        'Verifikasi gagal atau waktu habis. Klik tombol verifikasi untuk mencoba kembali.'
      );
      playChime('alert');
    }
  };

  const handleManualPauseToggle = () => {
    if (isPaused) {
      if (useManagedWindow && !surfWindowAlive && currentSite) {
        openManagedSurfWindow(visitUrl);
        return;
      }
      setIsPaused(false);
      setPauseReason('');
    } else {
      setIsPaused(true);
      setPauseReason('Dijeda secara manual oleh pengguna.');
    }
  };

  const handleReportSite = (reason: string) => {
    if (currentSite) {
      onReportWebsite?.(currentSite.id, reason);
    }
    setReportSuccess(true);
    setTimeout(() => {
      setReportModalOpen(false);
      setReportSuccess(false);
      nextSite();
    }, 1100);
  };

  const progressPercent =
    targetDuration > 0
      ? Math.max(0, Math.min(100, Math.round(((targetDuration - remainingSec) / targetDuration) * 100)))
      : 0;

  // Enforce Indonesia-Only Surf Gate (non-admin non-ID blocked)
  if (isGeoBlocked) {
    return (
      <div className="rounded-xl border border-rose-800/60 bg-rose-950/25 p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-3">
          <MapPin className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">
          Selancar Khusus Koneksi Indonesia
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed">
          {geoStatus?.message ||
            `IP Anda terdeteksi dari ${geoStatus?.countryName || geoStatus?.countryCode || 'luar Indonesia'}. Sesi selancar hanya diizinkan dari jaringan Indonesia tanpa VPN/Proxy luar negeri demi menjaga kemurnian analitik pengiklan.`}
        </p>
      </div>
    );
  }

  if (!currentSite) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-10 text-center">
        <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-100">
          Antrean Selancar Kosong
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
          Belum ada website aktif yang lolos audit kepatuhan dengan sisa alokasi poin cukup. Tambahkan website baru atau isi ulang saldo kampanye.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* RankBoostUp Persistent Surf Control Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Countdown Ring + Active Target Metadata */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" aria-hidden="true">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  className="stroke-slate-800"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  className={`${
                    isPaused ? 'stroke-amber-500' : 'stroke-emerald-400'
                  } transition-all duration-500`}
                  strokeWidth="4"
                  strokeDasharray={150.79}
                  strokeDashoffset={150.79 - (150.79 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
                  {remainingSec}
                </span>
                <span className="text-[9px] text-slate-400 -mt-0.5">detik</span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-100 truncate max-w-[260px] sm:max-w-md">
                  {currentSite.title}
                </h2>
                <span className="text-xs text-slate-600 hidden sm:inline">·</span>
                <span className="text-xs font-mono text-slate-400 truncate max-w-[180px]">
                  {currentSite.url.replace(/^https?:\/\//, '')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 mt-1">
                <span className="text-emerald-400 font-semibold font-mono tabular-nums">
                  +{(currentSite.pointsCostPerVisit * user.surfRatio).toFixed(2)} Poin
                </span>
                <span>·</span>
                <span className="font-mono tabular-nums">
                  {currentSite.durationSec}s
                </span>
                <span>·</span>
                <span>
                  {currentSite.referrerPolicy === 'referral' ? 'Referral' : 'Direct'}
                  {currentSite.utmEnabled ? ' + UTM' : ''}
                </span>
                <span>·</span>
                <span className="text-slate-300">
                  Rasio {Math.round(user.surfRatio * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Touch-Friendly RankBoostUp Surf Bar Controls (min 44px hitboxes on mobile) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lite 4G Toggle */}
            <button
              type="button"
              onClick={toggleLite4G}
              aria-pressed={lite4gMode}
              className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                lite4gMode
                  ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                  : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
              }`}
              title="Prioritaskan halaman ringan & hemat kuota untuk koneksi 4G mobile"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{lite4gMode ? 'Hemat 4G: ON' : 'Mode 4G'}</span>
            </button>

            {/* Auto-Advance Toggle */}
            <label className="min-h-[44px] sm:min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span>Rotasi Auto</span>
            </label>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={handleManualPauseToggle}
              className={`min-h-[44px] sm:min-h-[36px] flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lanjutkan</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Jeda</span>
                </>
              )}
            </button>

            {/* Skip */}
            <button
              type="button"
              onClick={nextSite}
              className="min-h-[44px] sm:min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Lewati</span>
            </button>

            {/* Sound */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* Report */}
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-rose-950/40 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Laporkan Pelanggaran (Judi, Phising, Rusak)"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Telemetry & Delivery Mode Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-center">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                antiCheatStatus.tabFocused ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-400">Fokus:</span>
            <span
              className={`font-medium ${
                antiCheatStatus.tabFocused ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {surfWindowAlive && useManagedWindow
                ? 'Jendela Selancar Aktif'
                : antiCheatStatus.tabFocused
                ? 'Aktif'
                : 'Latar Belakang'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Entropi:</span>
            <span className="font-mono tabular-nums text-slate-200 font-semibold">
              {antiCheatStatus.mouseEntropyScore}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Wilayah IP:</span>
            <span className="font-mono text-slate-200">
              {geoStatus?.adminBypass
                ? `Admin Bypass (${geoStatus.countryCode})`
                : `${geoStatus?.countryCode || 'ID'} Terverifikasi`}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-start lg:justify-end">
            <span className="text-slate-400 shrink-0">Mesin:</span>
            <select
              value={deliveryMode}
              onChange={(e) => changeDeliveryMode(e.target.value as SurfDeliveryMode)}
              className="px-2 py-1 rounded border border-slate-800 bg-slate-950 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              title="Pilih cara menampilkan website tujuan"
            >
              <option value="auto">Hybrid Pintar (Auto)</option>
              <option value="window">Jendela Terkontrol (RankBoostUp)</option>
              <option value="iframe">Live Iframe Saja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Surf Viewport Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
        {/* Browser Chrome Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 mr-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 w-52 sm:w-96 truncate">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-slate-200 truncate font-mono">{visitUrl}</span>
            </div>
          </div>

          {/* Viewport Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!useManagedWindow ? (
              <button
                type="button"
                onClick={() => openManagedSurfWindow(visitUrl, true)}
                className="px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                title="Alihkan situs ini ke satu jendela selancar terkontrol ala RankBoostUp"
              >
                <AppWindow className="w-3.5 h-3.5 text-amber-400" />
                <span>Layar Kosong? Mode Jendela</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setForcedWindowSiteIds((prev) => {
                    const copy = { ...prev };
                    delete copy[currentSite.id];
                    return copy;
                  });
                  if (deliveryMode === 'window') {
                    changeDeliveryMode('auto');
                  }
                }}
                className="px-2.5 py-1.5 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                Kembali ke Hybrid
              </button>
            )}

            {surfWindowAlive && (
              <button
                type="button"
                onClick={closeManagedSurfWindow}
                className="px-2.5 py-1.5 rounded-md border border-emerald-700/50 bg-emerald-950/50 text-[11px] text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
              >
                Jendela Aktif ✓ (Tutup)
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIframeLoaded(false);
                setVisitNonce((n) => n + 1);
              }}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Muat ulang halaman"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <div className="hidden sm:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  deviceMode === 'desktop'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan Desktop"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  deviceMode === 'mobile'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan Mobile HP"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Content */}
        <div
          className={`relative bg-slate-900/40 min-h-[420px] sm:min-h-[500px] flex items-center justify-center p-4 transition-all duration-300 ${
            deviceMode === 'mobile' ? 'py-6' : ''
          }`}
        >
          {/* Pause Overlay (only blocks iframe view; when managed window needed, shows clean launch CTA) */}
          {isPaused && !(useManagedWindow && !surfWindowAlive) && (
            <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">
                Sesi Berselancar Dijeda
              </h3>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                {pauseReason || 'Pemeriksaan keamanan anti-cheat sedang aktif.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleManualPauseToggle}
                  className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-900/30 transition-colors"
                >
                  Lanjutkan Selancar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChallenge(true);
                    setChallengeReason('Verifikasi Manual Pengguna');
                  }}
                  className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Verifikasi Kehadiran
                </button>
              </div>
            </div>
          )}

          {useManagedWindow ? (
            <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto border ${
                  surfWindowAlive
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <AppWindow className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  {surfWindowAlive
                    ? 'Jendela Selancar RankBoostUp Aktif & Berputar Otomatis'
                    : 'Mode Jendela Terkontrol (1x Klik — Anti Blokir Iframe)'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-1">
                  {currentSite.title}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1.5 leading-relaxed">
                  {surfWindowAlive
                    ? 'Website sedang terbuka penuh di jendela/tab selancar utama. Setelah hitungan detik selesai, poin langsung masuk dan jendela yang sama otomatis berpindah ke URL berikutnya.'
                    : 'Cukup klik sekali tombol di bawah untuk membuka 1 jendela selancar terkontrol. Semua website—termasuk yang membatasi iframe—akan terbuka asli dan tercatat Google Analytics (GA4).'}
                </p>
              </div>

              {currentSite.previewContent?.description && (
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 max-w-lg mx-auto text-left">
                  {currentSite.previewContent.description}
                </div>
              )}

              {popupBlocked && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/50 text-amber-200 text-xs max-w-lg mx-auto">
                  Browser memblokir popup otomatis. Klik tautan langsung di bawah untuk membuka di tab terkontrol:
                  <div className="mt-2">
                    <a
                      href={visitUrl}
                      target="trafik_surf_window"
                      rel={currentSite.referrerPolicy === 'referral' ? 'noopener' : 'noreferrer'}
                      onClick={() => {
                        setPopupBlocked(false);
                        setSurfWindowAlive(true);
                        antiCheatEngine.setExternalSurfWindowActive(true);
                        setIsPaused(false);
                        setPauseReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 text-slate-950 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka URL Sekarang</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openManagedSurfWindow(visitUrl)}
                  className="min-h-[44px] px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {surfWindowAlive
                      ? 'Fokus / Muat Ulang di Jendela Selancar'
                      : 'Buka Jendela Selancar (1x)'}
                  </span>
                </button>

                {surfWindowAlive && (
                  <button
                    type="button"
                    onClick={nextSite}
                    className="min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Putar Situs Berikutnya</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`relative w-full bg-white rounded-lg border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-300 ${
                deviceMode === 'mobile'
                  ? 'max-w-[390px] h-[520px] rounded-2xl border-2 border-slate-700'
                  : 'max-w-full h-[540px]'
              }`}
            >
              {!iframeLoaded && (
                <div className="absolute inset-0 z-10 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                  <p className="text-xs font-semibold text-slate-200">
                    Memuat Live Website: {currentSite.url}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                    Skrip analitik (GA4) situs tujuan dijalankan langsung dari browser Anda.
                  </p>
                </div>
              )}

              <iframe
                key={`${currentSite.id}-${visitNonce}`}
                src={visitUrl}
                title={currentSite.title}
                loading={lite4gMode ? 'lazy' : 'eager'}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy={
                  currentSite.referrerPolicy === 'referral'
                    ? 'strict-origin-when-cross-origin'
                    : 'no-referrer'
                }
                onLoad={() => setIframeLoaded(true)}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          )}
        </div>

        {/* Bottom Session Metrics Strip */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Situs Dikunjungi:{' '}
              <strong className="text-slate-200 font-mono tabular-nums font-semibold">
                {sessionHitsCompleted}
              </strong>
            </span>
            <span>·</span>
            <span>
              Poin Diperoleh:{' '}
              <strong className="text-emerald-400 font-mono tabular-nums font-semibold">
                +{sessionPointsEarned.toFixed(2)}
              </strong>
            </span>
            {lite4gMode && (
              <>
                <span>·</span>
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  Prioritas Cepat 4G Aktif
                </span>
              </>
            )}
          </div>

          {PAYMENTS_ENABLED ? (
            <div className="flex items-center gap-2">
              <span>Ingin rasio poin 100% penuh?</span>
              <button
                type="button"
                onClick={onOpenPricing}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer"
              >
                Upgrade Pro Nusantara
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400/90 font-medium">
              <span>100% Gratis · Kumpulkan Poin Tanpa Batas</span>
            </div>
          )}
        </div>
      </div>

      {/* Human Verification Modal */}
      <HumanVerificationModal
        isOpen={showChallenge}
        onVerify={handleChallengeResult}
        reason={challengeReason}
      />

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <Flag className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-100">
                Laporkan Website Bermasalah
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Laporkan jika situs melanggar aturan hukum Indonesia (judi online, phishing, konten berbahaya, atau frame breaker).
            </p>

            {reportSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Terima kasih! Website berhasil dilaporkan dan dilewati dari antrean Anda.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  'Judi Online / Slot Gacor (Melanggar UU ITE)',
                  'Phishing / Penipuan Data Pribadi',
                  'Malware / Skrip Berbahaya / Frame-Buster',
                  'Situs Rusak / Error 404 / Tidak Dapat Dimuat',
                ].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleReportSite(reason)}
                    className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    {reason}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
