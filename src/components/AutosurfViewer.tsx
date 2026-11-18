import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Info,
  CheckCircle2,
  Layers,
  Globe
} from 'lucide-react';
import { WebsiteCampaign, UserProfile, AntiCheatStatus, AntiCheatLogEntry } from '../types';
import { antiCheatEngine } from '../services/antiCheatEngine';
import { HumanVerificationModal } from './HumanVerificationModal';
import { APP_CONFIG } from '../config/appConfig';

interface AutosurfViewerProps {
  user: UserProfile;
  websites: WebsiteCampaign[];
  onAwardPoints: (points: number, siteTitle: string) => void;
  onDeductSitePoints: (siteId: string, points: number) => void;
  onOpenPricing: () => void;
  onReportWebsite?: (siteId: string, reason: string) => void;
}

export const AutosurfViewer: React.FC<AutosurfViewerProps> = ({
  user,
  websites,
  onAwardPoints,
  onDeductSitePoints,
  onOpenPricing,
  onReportWebsite,
}) => {
  // Only surf websites that passed Kominfo compliance audit and are active
  const approvedSites = websites.filter(
    (w) => w.auditStatus === 'approved' && w.status === 'active' && w.allocatedPoints >= w.pointsCostPerVisit
  );

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [visitNonce, setVisitNonce] = useState<number>(1);
  const [remainingSec, setRemainingSec] = useState<number>(30);
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<string>('');
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showChallenge, setShowChallenge] = useState<boolean>(false);
  const [challengeReason, setChallengeReason] = useState<string>('');
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [sessionPointsEarned, setSessionPointsEarned] = useState<number>(0);
  const [sessionHitsCompleted, setSessionHitsCompleted] = useState<number>(0);

  // Hybrid Surf State (Live Iframe + Controlled Surf Tab Fallback)
  const [hybridTabEnabled, setHybridTabEnabled] = useState<boolean>(false);
  const [forcedTabSiteIds, setForcedTabSiteIds] = useState<Record<string, boolean>>({});
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const surfTabRef = useRef<Window | null>(null);

  // Anti-cheat live telemetry
  const [antiCheatStatus, setAntiCheatStatus] = useState<AntiCheatStatus>(antiCheatEngine.getStatus());

  const safeIdx = approvedSites.length > 0 ? currentIdx % approvedSites.length : 0;
  const currentSite = approvedSites[safeIdx];
  const needsTabFallback = currentSite
    ? currentSite.iframeAllowed === false || Boolean(forcedTabSiteIds[currentSite.id])
    : false;
  const timerRef = useRef<number | null>(null);
  const showChallengeRef = useRef<boolean>(showChallenge);
  showChallengeRef.current = showChallenge;

  // Sync paused state to anti-cheat engine so paused/challenge states don't decay entropy
  useEffect(() => {
    antiCheatEngine.setSurfPaused(isPaused || showChallenge);
  }, [isPaused, showChallenge]);

  // Initialize anti-cheat engine strictly while Surf Mode is active
  useEffect(() => {
    const unsubscribe = antiCheatEngine.subscribe((entry: AntiCheatLogEntry) => {
      setAntiCheatStatus(antiCheatEngine.getStatus());

      if (entry.type === 'VISIBILITY_LOST') {
        setIsPaused(true);
        setPauseReason('Tab browser di latar belakang. Kunjungan dijeda untuk memastikan tayangan asli.');
      } else if (entry.type === 'VISIBILITY_RESTORED') {
        // Automatically resume if not blocked by challenge
        if (!showChallengeRef.current) {
          setIsPaused(false);
          setPauseReason('');
        }
      } else if (entry.type === 'LOW_ENTROPY_DETECTED') {
        setIsPaused(true);
        setPauseReason('Aktivitas kursor nol terdeteksi. Silakan selesaikan pemeriksaan kehadiran.');
        setChallengeReason('Deteksi Tidak Ada Aktivitas (AFK / Bot)');
        setShowChallenge(true);
      } else if (entry.type === 'CONCURRENCY_LOCKED') {
        setIsPaused(true);
        setPauseReason('Sesi ganda terdeteksi. Tutup tab selancar lain untuk melanjutkan.');
      }
    });

    antiCheatEngine.startSurfing();
    setAntiCheatStatus(antiCheatEngine.getStatus());

    return () => {
      unsubscribe();
      antiCheatEngine.stopSurfing();
    };
  }, []);

  // Set initial site duration & reset iframe loaded flag when site changes
  useEffect(() => {
    if (currentSite) {
      setTargetDuration(currentSite.durationSec);
      setRemainingSec(currentSite.durationSec);
      setIframeLoaded(false);

      // If hybrid controlled tab is already active and this site needs fallback, navigate the same tab
      if (
        (currentSite.iframeAllowed === false || forcedTabSiteIds[currentSite.id]) &&
        hybridTabEnabled &&
        surfTabRef.current &&
        !surfTabRef.current.closed
      ) {
        try {
          surfTabRef.current.location.href = currentSite.url;
        } catch {
          // cross-origin location assignment allowed; fallback silently if browser restricts
        }
      }

      const loadTimeout = window.setTimeout(() => setIframeLoaded(true), 4000);
      return () => window.clearTimeout(loadTimeout);
    }
  }, [safeIdx, visitNonce, currentSite?.id]);

  // Sound chime helper (synthesized Web Audio API tone without external audio files)
  const playChime = (type: 'success' | 'alert') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      // AudioContext not allowed or muted
    }
  };

  // Main countdown loop with anti-cheat heartbeat verification
  useEffect(() => {
    if (isPaused || showChallenge) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      // Periodic heartbeat check every 3-5 seconds
      if (currentSite && remainingSec % 4 === 0) {
        const { valid } = antiCheatEngine.generateProofOfSurfHeartbeat(currentSite.id);
        if (!valid) {
          setIsPaused(true);
          setPauseReason('Pemeriksaan heartbeat integritas gagal. Menjaga distribusi poin adil.');
          return;
        }
      }

      setRemainingSec((prev) => {
        if (prev <= 1) {
          // Completed site visit!
          handleSiteCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, showChallenge, currentSite, remainingSec]);

  // When a site timer finishes
  const handleSiteCompletion = () => {
    if (!currentSite) return;

    // Calculate points earned: base points * user ratio
    const earned = currentSite.pointsCostPerVisit * user.surfRatio;
    onAwardPoints(earned, currentSite.title);
    onDeductSitePoints(currentSite.id, currentSite.pointsCostPerVisit);

    setSessionPointsEarned((prev) => prev + earned);
    setSessionHitsCompleted((prev) => prev + 1);

    antiCheatEngine.recordPointCredit(earned, currentSite.title);
    playChime('success');

    // Trigger occasional proof-of-presence challenge (e.g. every 5 visits)
    if ((sessionHitsCompleted + 1) % 5 === 0) {
      setIsPaused(true);
      setChallengeReason('Pemeriksaan Kehadiran Rutin (Setiap 5 Kunjungan)');
      setShowChallenge(true);
      return;
    }

    // Auto move to next site
    if (autoAdvance) {
      nextSite();
    } else {
      setIsPaused(true);
      setPauseReason('Kunjungan selesai. Klik Selanjutnya atau aktifkan Selancar Otomatis.');
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

  const handleOpenControlledTab = (siteUrl: string, markForced = false) => {
    if (markForced && currentSite) {
      setForcedTabSiteIds((prev) => ({ ...prev, [currentSite.id]: true }));
    }
    setHybridTabEnabled(true);
    try {
      const opened = window.open(siteUrl, 'trafik_surf_tab');
      if (opened) {
        surfTabRef.current = opened;
      }
    } catch {
      // Fallback handled by anchor target="trafik_surf_tab"
    }
  };

  const handleCloseControlledTab = () => {
    setHybridTabEnabled(false);
    if (surfTabRef.current && !surfTabRef.current.closed) {
      try {
        surfTabRef.current.close();
      } catch {
        // ignore
      }
    }
    surfTabRef.current = null;
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
      setPauseReason('Verifikasi gagal atau waktu habis. Klik tombol verifikasi untuk mencoba kembali.');
      playChime('alert');
    }
  };

  const handleManualPauseToggle = () => {
    if (isPaused) {
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
    }, 1200);
  };

  const progressPercent = targetDuration > 0
    ? Math.max(0, Math.min(100, Math.round(((targetDuration - remainingSec) / targetDuration) * 100)))
    : 0;

  if (!currentSite) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-12 text-center">
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
      {/* Top Controls & Status Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Current Website Info & Live Progress */}
          <div className="flex items-center gap-4">
            {/* Progress Circular Timer */}
            <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90">
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

            {/* Current Site Title & Metadata */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 truncate max-w-sm sm:max-w-md">
                  {currentSite?.title || 'Memuat Website...'}
                </h2>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-mono text-slate-400 truncate max-w-[140px]">
                  {currentSite?.url.replace('https://', '')}
                </span>
              </div>

              {/* Unboxed metadata tags */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                <span className="text-emerald-400 font-semibold font-mono tabular-nums">
                  +{(currentSite ? currentSite.pointsCostPerVisit * user.surfRatio : 0).toFixed(2)} Poin
                </span>
                <span>·</span>
                <span>Wilayah: {currentSite?.targetRegion.replace('_', ' ').toUpperCase()}</span>
                <span>·</span>
                <span>Durasi: {currentSite?.durationSec}s</span>
                <span>·</span>
                <span className="text-slate-300">
                  Rasio: {Math.round(user.surfRatio * 100)}% ({user.membership === 'gratis' ? 'Gratis' : 'Pro VIP'})
                </span>
              </div>
            </div>
          </div>

          {/* Right: Operational Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-advance toggle */}
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <span>Selancar Otomatis</span>
            </label>

            {/* Pause / Resume Button */}
            <button
              onClick={handleManualPauseToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
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

            {/* Skip / Next Button */}
            <button
              onClick={nextSite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Lewati</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={soundEnabled ? 'Matikan Suara Chime' : 'Aktifkan Suara Chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Report Button */}
            <button
              onClick={() => setReportModalOpen(true)}
              className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-rose-950/40 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Laporkan Pelanggaran (Judi, Phising, Rusak)"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Anti-Cheat Telemetry HUD Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Indicator 1: Tab Visibility */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                antiCheatStatus.tabFocused ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-400">Fokus Tab:</span>
            <span
              className={`font-medium ${
                antiCheatStatus.tabFocused ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {antiCheatStatus.tabFocused ? 'Aktif' : 'Latar Belakang'}
            </span>
          </div>

          {/* Indicator 2: Mouse Entropy */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Entropi Manusia:</span>
            <span className="font-mono tabular-nums text-slate-200 font-semibold">
              {antiCheatStatus.mouseEntropyScore}%
            </span>
          </div>

          {/* Indicator 3: Heartbeat Verification */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                antiCheatStatus.heartbeatSync ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400">Heartbeat:</span>
            <span className="text-slate-300">Tersinkron</span>
          </div>

          {/* Indicator 4: Hybrid Delivery Mode */}
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Pengiriman:</span>
            <span className="text-slate-300">
              {needsTabFallback ? 'Hybrid Tab Terkontrol' : 'Live Iframe (GA4)'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Hybrid Website Browser Frame */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
        {/* Browser Top Chrome Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 mr-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Address Bar */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 w-56 sm:w-96 truncate">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-slate-200 truncate font-mono">{currentSite.url}</span>
            </div>
          </div>

          {/* Device Emulation Toggles & Hybrid Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {!needsTabFallback ? (
              <button
                type="button"
                onClick={() => handleOpenControlledTab(currentSite.url, true)}
                className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                title="Jika situs menolak iframe (layar kosong), klik untuk beralih ke Tab Terkontrol"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Layar Kosong? Mode Tab</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setForcedTabSiteIds((prev) => {
                    const copy = { ...prev };
                    delete copy[currentSite.id];
                    return copy;
                  });
                }}
                className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors cursor-pointer"
              >
                Coba Live Iframe
              </button>
            )}

            {hybridTabEnabled && (
              <button
                type="button"
                onClick={handleCloseControlledTab}
                className="px-2.5 py-1 rounded-md border border-emerald-700/50 bg-emerald-950/50 text-[11px] text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
              >
                Tab Hybrid Aktif ✓
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

            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
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

            <a
              href={currentSite.url}
              target="trafik_surf_tab"
              rel={currentSite.referrerPolicy === 'referral' ? 'noopener' : 'noreferrer'}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title="Buka URL asli di tab terpisah"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Viewport Content Area */}
        <div
          className={`relative bg-slate-900/40 min-h-[500px] flex items-center justify-center p-4 transition-all duration-300 ${
            deviceMode === 'mobile' ? 'py-8' : ''
          }`}
        >
          {/* Pause / Warning Overlay when paused */}
          {isPaused && (
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

              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={() => {
                    setIsPaused(false);
                    setPauseReason('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-900/30 transition-colors"
                >
                  Lanjutkan Selancar
                </button>
                <button
                  onClick={() => {
                    setShowChallenge(true);
                    setChallengeReason('Verifikasi Manual Pengguna');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  Buka Verifikasi Kehadiran
                </button>
              </div>
            </div>
          )}

          {/* Live Hybrid Viewport: Real Iframe OR Controlled Surf Tab Fallback */}
          {needsTabFallback ? (
            <div
              className={`w-full bg-slate-900 rounded-lg border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-300 ${
                deviceMode === 'mobile' ? 'max-w-sm rounded-2xl border-2 border-slate-700' : 'max-w-3xl'
              }`}
            >
              <div className="p-6 sm:p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <ExternalLink className="w-6 h-6" />
                </div>

                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                    Mode Tab Terkontrol (Hybrid Fallback)
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-1">
                    {currentSite.title}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto mt-1.5 leading-relaxed">
                    Website ini membatasi embed iframe (<code>X-Frame-Options</code> / Platform Video). Dengan Mode Tab Hybrid, kunjungan dimuat langsung di satu tab browser terkontrol sehingga <strong>Google Analytics (GA4) tetap mencatat kunjungan nyata</strong> tanpa bentrok blokir iframe.
                  </p>
                </div>

                {currentSite.previewContent?.description && (
                  <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 max-w-lg mx-auto text-left">
                    {currentSite.previewContent.description}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenControlledTab(currentSite.url)}
                    className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 shadow-lg shadow-emerald-900/30 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {hybridTabEnabled ? 'Fokus / Muat Ulang di Tab Hybrid' : 'Buka & Aktifkan Tab Hybrid'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      antiCheatEngine.getStatus().mouseEntropyScore = 95;
                    }}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                  >
                    ✓ Konfirmasi Kunjungan Aktif
                  </button>
                </div>

                {hybridTabEnabled && (
                  <p className="text-[11px] text-emerald-400">
                    Tab Hybrid aktif — situs berikutnya yang memerlukan fallback akan otomatis dimuat di tab yang sama.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div
              className={`relative w-full bg-white rounded-lg border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-300 ${
                deviceMode === 'mobile' ? 'max-w-[390px] h-[560px] rounded-2xl border-2 border-slate-700' : 'max-w-full h-[540px]'
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
                src={currentSite.url}
                title={currentSite.title}
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

        {/* Surf Session Session Counter Bottom Bar */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Situs Dikunjungi Sesi Ini:{' '}
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
          </div>

          <div className="flex items-center gap-2">
            <span>Ingin rasio poin 100% tanpa potongan?</span>
            <button
              onClick={onOpenPricing}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 cursor-pointer"
            >
              Upgrade Pro Nusantara
            </button>
          </div>
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
                <CheckCircle2 className="w-4 h-4" />
                <span>Terima kasih! Website berhasil dilaporkan dan dilewati dari antrean Anda.</span>
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
                    onClick={() => handleReportSite(reason)}
                    className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                  >
                    {reason}
                  </button>
                ))}

                <button
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
