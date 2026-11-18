import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  ChevronRight,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { AntiCheatLogEntry } from '../types';

export interface AntiCheatToastItem {
  id: string;
  log: AntiCheatLogEntry;
  createdAt: number;
  durationMs: number;
}

interface AntiCheatToastContainerProps {
  toasts: AntiCheatToastItem[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onInspect: (log: AntiCheatLogEntry) => void;
}

/**
 * Web Audio API synthesized security alert sound (pure zero-dependency)
 */
const playSecurityChime = (severity: 'warning' | 'critical') => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (severity === 'critical') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(840, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(370, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch {
    // Graceful fallback if audio is blocked or restricted
  }
};

/**
 * Individual Toast Item with countdown bar, pause-on-hover, and actions
 */
const SingleToastItem: React.FC<{
  toast: AntiCheatToastItem;
  soundEnabled: boolean;
  onDismiss: (id: string) => void;
  onInspect: (log: AntiCheatLogEntry) => void;
}> = ({ toast, soundEnabled, onDismiss, onInspect }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);
  const isCritical = toast.log.severity === 'critical';

  // Sound alert on initial mount
  useEffect(() => {
    if (soundEnabled) {
      playSecurityChime(toast.log.severity === 'critical' ? 'critical' : 'warning');
    }
  }, []);

  // Countdown timer with pause on hover
  useEffect(() => {
    if (isHovered) {
      elapsedBeforePauseRef.current += Date.now() - startTimeRef.current;
      return;
    }

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const currentRun = Date.now() - startTimeRef.current;
      const totalElapsed = elapsedBeforePauseRef.current + currentRun;
      const remainingRatio = Math.max(0, 1 - totalElapsed / toast.durationMs);

      setProgressPercent(remainingRatio * 100);

      if (totalElapsed >= toast.durationMs) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, toast.durationMs, toast.id, onDismiss]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      className={`relative w-full max-w-sm sm:max-w-md rounded-xl overflow-hidden shadow-2xl transition-all duration-300 pointer-events-auto border backdrop-blur-xl ${
        isCritical
          ? 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/50 hover:border-rose-400'
          : 'bg-slate-900/95 border-amber-500/50 shadow-amber-950/50 hover:border-amber-400'
      }`}
      style={{
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Accent side bar */}
      <div
        className={`absolute top-0 left-0 bottom-0 w-1.5 ${
          isCritical ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      />

      <div className="p-4 pl-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {isCritical ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            ) : (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            )}

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                isCritical
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
              }`}
            >
              {isCritical ? 'Anti-Cheat Kritis' : 'Peringatan Anomali'}
            </span>

            <span className="text-[11px] text-slate-500 font-mono">
              Baru saja
            </span>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Tutup Notifikasi"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex items-start gap-3 mt-1">
          <div
            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
              isCritical
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs sm:text-sm font-bold leading-snug ${
                isCritical ? 'text-rose-200' : 'text-amber-200'
              }`}
            >
              {toast.log.title}
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-3">
              {toast.log.details}
            </p>

            {toast.log.metricValue && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300">
                <Radio className="w-3 h-3 text-slate-500" />
                <span>Indikator: {toast.log.metricValue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={() => onInspect(toast.log)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isCritical
                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            <span>Buka Konsol Anti-Cheat</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] text-slate-500 italic">
            {isHovered ? 'Timer dijeda' : 'Otomatis tutup'}
          </span>
        </div>
      </div>

      {/* Dynamic auto-dismiss progress bar */}
      <div className="w-full h-1 bg-slate-800/80">
        <div
          className={`h-full transition-all ease-linear ${
            isCritical ? 'bg-rose-500' : 'bg-amber-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

export const AntiCheatToastContainer: React.FC<AntiCheatToastContainerProps> = ({
  toasts,
  onDismiss,
  onDismissAll,
  onInspect,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('tn_anticheat_sound_enabled') !== 'false';
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('tn_anticheat_sound_enabled', String(next));
      return next;
    });
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="assertive"
    >
      {/* Toast toolbar when multiple toasts active */}
      <div className="flex items-center justify-between px-2 text-xs pointer-events-auto">
        <button
          onClick={toggleSound}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors shadow-lg cursor-pointer"
          title={soundEnabled ? 'Matikan Suara Peringatan' : 'Aktifkan Suara Peringatan'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Suara Alert: On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              <span>Suara Alert: Off</span>
            </>
          )}
        </button>

        {toasts.length > 1 && (
          <button
            onClick={onDismissAll}
            className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors shadow-lg cursor-pointer"
          >
            Tutup Semua ({toasts.length})
          </button>
        )}
      </div>

      {/* Stacked list of toasts */}
      {toasts.map((toast) => (
        <SingleToastItem
          key={toast.id}
          toast={toast}
          soundEnabled={soundEnabled}
          onDismiss={onDismiss}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
};
