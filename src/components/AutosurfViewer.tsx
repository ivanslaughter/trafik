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
  CheckCircle2
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

  // Anti-cheat live telemetry
  const [antiCheatStatus, setAntiCheatStatus] = useState<AntiCheatStatus>(antiCheatEngine.getStatus());

  const currentSite = approvedSites[currentIdx] || approvedSites[0];
  const timerRef = useRef<number | null>(null);

  // Initialize anti-cheat engine hooks
  useEffect(() => {
    const unsubscribe = antiCheatEngine.subscribe((entry: AntiCheatLogEntry) => {
      setAntiCheatStatus(antiCheatEngine.getStatus());

      if (entry.type === 'VISIBILITY_LOST') {
        setIsPaused(true);
        setPauseReason('Tab browser di latar belakang. Kunjungan dijeda untuk memastikan tayangan asli.');
      } else if (entry.type === 'VISIBILITY_RESTORED') {
        // Automatically resume if not blocked by challenge
        if (!showChallenge) {
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

    antiCheatEngine.init();

    return () => {
      unsubscribe();
    };
  }, [showChallenge]);

  // Set initial site duration
  useEffect(() => {
    if (currentSite) {
      setTargetDuration(currentSite.durationSec);
      setRemainingSec(currentSite.durationSec);
    }
  }, [currentIdx, currentSite]);

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
    const nextIndex = (currentIdx + 1) % websites.length;
    setCurrentIdx(nextIndex);
    const nextSiteObj = websites[nextIndex];
    if (nextSiteObj) {
      setTargetDuration(nextSiteObj.durationSec);
      setRemainingSec(nextSiteObj.durationSec);
      setIsPaused(false);
      setPauseReason('');
    }
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

          {/* Indicator 4: Sandboxed Frame */}
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Shield:</span>
            <span className="text-slate-300">Sandbox HTML5</span>
          </div>
        </div>
      </div>

      {/* Interactive Sandbox Website Browser Frame */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
        {/* Browser Top Chrome Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>

            {/* Address Bar */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-300 w-72 sm:w-96 truncate">
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-slate-500 select-none">https://</span>
              <span className="text-slate-200 truncate">{currentSite?.url.replace('https://', '')}</span>
            </div>
          </div>

          {/* Device Emulation Toggles & Actions */}
          <div className="flex items-center gap-2">
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
              href={currentSite?.url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title="Buka URL asli di jendela terpisah"
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

          {/* Sandboxed Simulated Indonesian Website Page */}
          <div
            className={`w-full bg-slate-900 rounded-lg border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-300 ${
              deviceMode === 'mobile' ? 'max-w-sm rounded-2xl border-2 border-slate-700' : 'max-w-5xl'
            }`}
          >
            {/* Website Header Bar inside sandbox */}
            <div className="border-b border-slate-800 bg-slate-900/90 px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                  {currentSite?.category.toUpperCase()} INDONESIA
                </span>
                <h1 className="text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                  {currentSite?.previewContent?.headline || currentSite?.title}
                </h1>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs text-slate-300 font-medium">
                  {currentSite?.previewContent?.author || 'Webmaster Indonesia'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {currentSite?.previewContent?.city || 'Indonesia'}
                </div>
              </div>
            </div>

            {/* Website Body Content */}
            <div className="p-6 space-y-4 text-slate-300 text-sm leading-relaxed max-h-[440px] overflow-y-auto">
              <p className="font-medium text-slate-200 text-base">
                {currentSite?.previewContent?.description}
              </p>

              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/60 text-slate-300 text-xs sm:text-sm">
                {currentSite?.previewContent?.bodySnippet}
              </div>

              {/* Tags */}
              <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span className="text-slate-500">Topik:</span>
                {currentSite?.previewContent?.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Interactive simulated engagement (encouraging human mouse activity) */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-400 text-xs">
                  Kunjungan terverifikasi oleh Sistem Anti-Cheat {APP_CONFIG.fullName}
                </div>
                <button
                  onClick={() => {
                    // Clicking boosts entropy
                    antiCheatEngine.getStatus().mouseEntropyScore = 95;
                  }}
                  className="px-3 py-1.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors cursor-pointer font-medium"
                >
                  ✓ Konfirmasi Membaca Konten
                </button>
              </div>
            </div>
          </div>
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
