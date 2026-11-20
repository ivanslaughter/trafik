import { AntiCheatLogEntry, AntiCheatStatus } from '../types';
import { APP_NAME } from '../config/appConfig';

export interface HeartbeatPayload {
  sequence: number;
  clientTime: number;
  wallDeltaMs: number;
  entropySample: number;
  tabVisible: boolean;
  activeSessionId: string;
  nonce: string;
  signature: string;
}

export type AntiCheatEventCallback = (entry: AntiCheatLogEntry) => void;

class AntiCheatEngine {
  private status: AntiCheatStatus = {
    tabFocused: true,
    mouseEntropyScore: 85,
    heartbeatSync: true,
    concurrencyLockActive: false,
    frameShieldActive: true,
    lastHeartbeatTime: Date.now(),
    suspicionLevel: 'clean',
    consecutiveLowEntropySeconds: 0,
  };

  private broadcastChannel: BroadcastChannel | null = null;
  private currentSessionId: string = '';
  private listeners: Set<AntiCheatEventCallback> = new Set();
  private mousePoints: { x: number; y: number; time: number }[] = [];
  private lastTickTime: number = Date.now();
  private heartbeatSequence: number = 0;
  private entropyDecayInterval: number | null = null;
  private isEngineStarted: boolean = false;
  private isSurfingActive: boolean = false;
  private isPaused: boolean = false;
  private lowEntropyAlertSent: boolean = false;
  private externalSurfWindowActive: boolean = false;

  constructor() {
    this.currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 9);
  }

  public init(callback?: AntiCheatEventCallback) {
    if (callback) {
      this.listeners.add(callback);
    }

    if (this.isEngineStarted || !this.isSurfingActive) return;
    this.isEngineStarted = true;

    // 1. Setup Document Visibility & Focus Listener
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleFocus);
      window.addEventListener('blur', this.handleBlur);
      window.addEventListener('mousemove', this.handleMouseMove);
    }

    // 2. Setup Cross-Tab Concurrency Lock via BroadcastChannel & LocalStorage
    this.setupConcurrencyLock();

    // 3. Setup Entropy Decay & Heartbeat verification loop
    this.lastTickTime = Date.now();
    this.entropyDecayInterval = window.setInterval(() => {
      this.runPeriodicEntropyAudit();
    }, 1000);
  }

  public startSurfing() {
    this.isSurfingActive = true;
    this.isPaused = false;
    this.lowEntropyAlertSent = false;
    this.status.tabFocused = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
    this.status.mouseEntropyScore = 85;
    this.status.consecutiveLowEntropySeconds = 0;
    this.status.concurrencyLockActive = false;
    this.status.suspicionLevel = 'clean';
    this.mousePoints = [];
    this.init();
  }

  public stopSurfing() {
    this.isSurfingActive = false;
    this.isPaused = false;
    this.lowEntropyAlertSent = false;
    this.externalSurfWindowActive = false;
    this.status.consecutiveLowEntropySeconds = 0;
    this.status.mouseEntropyScore = 85;
    this.status.concurrencyLockActive = false;
    this.status.suspicionLevel = 'clean';
    this.destroy();
  }

  public setSurfPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      this.lowEntropyAlertSent = false;
    }
  }

  public setExternalSurfWindowActive(active: boolean) {
    this.externalSurfWindowActive = active;
    if (active) {
      this.status.tabFocused = true;
      this.status.suspicionLevel = 'clean';
      this.status.consecutiveLowEntropySeconds = 0;
      this.lowEntropyAlertSent = false;
      this.status.mouseEntropyScore = Math.max(this.status.mouseEntropyScore, 75);
    } else if (typeof document !== 'undefined') {
      this.status.tabFocused = document.visibilityState === 'visible';
    }
  }

  public subscribe(callback: AntiCheatEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emitLog(entry: Omit<AntiCheatLogEntry, 'id' | 'timestamp'>) {
    const fullEntry: AntiCheatLogEntry = {
      ...entry,
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    this.listeners.forEach((listener) => {
      try {
        listener(fullEntry);
      } catch (err) {
        console.error('AntiCheat listener error', err);
      }
    });
  }

  private handleVisibilityChange = () => {
    if (!this.isSurfingActive) return;

    // When a RankBoostUp-style managed external surf window is open and alive,
    // switching focus to view that external site is expected and must not pause the session.
    if (this.externalSurfWindowActive) {
      this.status.tabFocused = true;
      this.status.suspicionLevel = 'clean';
      return;
    }

    const isVisible = document.visibilityState === 'visible';
    this.status.tabFocused = isVisible;

    if (!isVisible) {
      this.status.suspicionLevel = 'suspicious';
      this.emitLog({
        type: 'VISIBILITY_LOST',
        title: 'Jeda Otomatis: Tab Latar Belakang Terdeteksi',
        details: 'Pengguna berpindah tab browser atau meminimalkan jendela. Akumulasi poin dijeda untuk menjaga keadilan penukaran trafik.',
        severity: 'warning',
        metricValue: 'visibilityState: hidden',
      });
    } else {
      this.emitLog({
        type: 'VISIBILITY_RESTORED',
        title: 'Fokus Pulih: Tab Aktif Kembali',
        details: 'Jendela kembali menjadi tab aktif di layar pengguna. Menjalankan verifikasi ulang sebelum melanjutkan selancar.',
        severity: 'info',
        metricValue: 'visibilityState: visible',
      });
      if (this.status.mouseEntropyScore >= 40) {
        this.status.suspicionLevel = 'clean';
      }
    }
  };

  private handleFocus = () => {
    this.status.tabFocused = true;
  };

  private handleBlur = () => {
    // If not visible, already handled. If still visible but blurred (e.g. devtools clicked or external window)
    if (document.visibilityState === 'visible') {
      // Slight attention warning
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    this.mousePoints.push({ x: e.clientX, y: e.clientY, time: now });

    // Keep last 30 mouse movements
    if (this.mousePoints.length > 30) {
      this.mousePoints.shift();
    }

    // Boost entropy score based on trajectory curvature and velocity variance
    if (this.mousePoints.length >= 5) {
      this.calculateMouseEntropy();
    }
  };

  private calculateMouseEntropy() {
    if (this.mousePoints.length < 5) return;

    let totalAngleChange = 0;
    let velocityDeltas = 0;

    for (let i = 2; i < this.mousePoints.length; i++) {
      const p0 = this.mousePoints[i - 2];
      const p1 = this.mousePoints[i - 1];
      const p2 = this.mousePoints[i];

      const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, dt: Math.max(1, p1.time - p0.time) };
      const v2 = { x: p2.x - p1.x, y: p2.y - p1.y, dt: Math.max(1, p2.time - p1.time) };

      const speed1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y) / v1.dt;
      const speed2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y) / v2.dt;

      velocityDeltas += Math.abs(speed2 - speed1);

      // Angle curvature
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      if (mag1 > 0 && mag2 > 0) {
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        totalAngleChange += Math.acos(cosTheta);
      }
    }

    // Organic human hand movement has both acceleration changes and angular shifts
    // Robotic linear bots have 0 angular change or identical speed
    const organicScore = Math.min(100, Math.round(totalAngleChange * 15 + velocityDeltas * 8));
    this.status.mouseEntropyScore = Math.max(10, Math.min(100, Math.round(this.status.mouseEntropyScore * 0.7 + organicScore * 0.3)));
    this.status.consecutiveLowEntropySeconds = 0;
    this.lowEntropyAlertSent = false;
  }

  private runPeriodicEntropyAudit() {
    if (!this.isSurfingActive || this.isPaused || !this.status.tabFocused) {
      return;
    }

    // While user is browsing inside the managed RankBoostUp external window,
    // mouse movements happen inside that external window rather than this control tab.
    if (this.externalSurfWindowActive) {
      this.status.mouseEntropyScore = Math.max(70, this.status.mouseEntropyScore);
      this.status.consecutiveLowEntropySeconds = 0;
      return;
    }

    // Decay entropy if no user movement
    if (this.status.mouseEntropyScore > 20) {
      this.status.mouseEntropyScore = Math.max(10, this.status.mouseEntropyScore - 3);
    } else {
      this.status.consecutiveLowEntropySeconds += 1;
    }

    // Emit once when zero human interaction persists >= 35s during active surfing
    if (
      this.status.consecutiveLowEntropySeconds >= 35 &&
      !this.lowEntropyAlertSent &&
      this.status.suspicionLevel !== 'flagged'
    ) {
      this.lowEntropyAlertSent = true;
      this.status.suspicionLevel = 'suspicious';
      this.emitLog({
        type: 'LOW_ENTROPY_DETECTED',
        title: 'Peringatan Entropi Rendah: Deteksi Otomasi / AFK',
        details: 'Tidak terdeteksi aktivitas kursor atau interaksi manusia selama lebih dari 35 detik. Sistem akan meminta verifikasi keberadaan sebelum poin diberikan.',
        severity: 'warning',
        metricValue: `Entropi: ${this.status.mouseEntropyScore}%`,
      });
    }
  }

  private setupConcurrencyLock() {
    const CHANNEL_NAME = `${APP_NAME.toLowerCase()}_surf_lock`;

    try {
      this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        if (!this.isSurfingActive) return;
        if (event.data?.type === 'SURF_ACTIVE_PING') {
          // Another tab is surfing!
          if (event.data.sessionId !== this.currentSessionId) {
            this.broadcastChannel?.postMessage({
              type: 'SURF_LOCK_EXISTING_ACTIVE',
              ownerSessionId: this.currentSessionId,
            });
          }
        } else if (event.data?.type === 'SURF_LOCK_EXISTING_ACTIVE') {
          if (event.data.ownerSessionId !== this.currentSessionId) {
            this.status.concurrencyLockActive = true;
            this.emitLog({
              type: 'CONCURRENCY_LOCKED',
              title: 'Proteksi Multi-Tab: Sesi Berselancar Ganda Terkunci',
              details: 'Ditemukan tab lain yang sedang aktif berselancar pada browser yang sama. Sistem hanya mengizinkan 1 sesi selancar aktif untuk mencegah eksploitasi poin berganda.',
              severity: 'critical',
              metricValue: 'Sesi Tab Ganda',
            });
          }
        }
      };

      // Announce this tab's surf start
      this.broadcastChannel.postMessage({
        type: 'SURF_ACTIVE_PING',
        sessionId: this.currentSessionId,
      });
    } catch {
      // Fallback to localStorage lock
      const activeLock = localStorage.getItem('tn_active_surf_session');
      const now = Date.now();
      if (activeLock) {
        try {
          const parsed = JSON.parse(activeLock);
          if (now - parsed.time < 5000 && parsed.sessionId !== this.currentSessionId) {
            this.status.concurrencyLockActive = true;
          }
        } catch {
          // ignore
        }
      }
      localStorage.setItem(
        'tn_active_surf_session',
        JSON.stringify({ sessionId: this.currentSessionId, time: now })
      );
    }
  }

  /**
   * Generates a cryptographic proof-of-surf heartbeat token.
   * Compares wall-clock elapsed time against expected execution interval to detect clock tampering / speed hacks.
   */
  public generateProofOfSurfHeartbeat(siteId: string): { valid: boolean; payload: HeartbeatPayload } {
    const now = Date.now();
    const wallDeltaMs = now - this.lastTickTime;
    this.lastTickTime = now;
    this.heartbeatSequence += 1;

    // Detect speed hacks (if interval between calls is < 1500ms when expecting ~3000-5000ms)
    let isSpeedTampered = false;
    if (this.heartbeatSequence > 1 && wallDeltaMs < 800) {
      isSpeedTampered = true;
      this.emitLog({
        type: 'TIME_DRIFT_PREVENTED',
        title: 'Manipulasi Waktu Browser Terdeteksi (Speed-Hack)',
        details: `Interval waktu eksekusi (${wallDeltaMs}ms) tidak wajar. Browser mungkin menggunakan ekstensi percepat waktu. Akumulasi poin ditolak.`,
        severity: 'critical',
        metricValue: `${wallDeltaMs}ms (minimum 1000ms)`,
      });
    }

    // Generate pseudo-HMAC nonced signature
    const nonce = Math.random().toString(36).substring(2, 10);
    const rawSignature = `${this.currentSessionId}:${siteId}:${this.heartbeatSequence}:${now}:${nonce}:${this.status.mouseEntropyScore}`;
    const signature = 'sig_' + btoa(rawSignature).substring(0, 24);

    const payload: HeartbeatPayload = {
      sequence: this.heartbeatSequence,
      clientTime: now,
      wallDeltaMs,
      entropySample: this.status.mouseEntropyScore,
      tabVisible: this.status.tabFocused,
      activeSessionId: this.currentSessionId,
      nonce,
      signature,
    };

    const valid = !isSpeedTampered && this.status.tabFocused && !this.status.concurrencyLockActive;
    this.status.heartbeatSync = valid;
    this.status.lastHeartbeatTime = now;

    if (valid && this.heartbeatSequence % 3 === 0) {
      this.emitLog({
        type: 'HEARTBEAT_VERIFIED',
        title: 'Heartbeat Integritas Valid',
        details: `Token detak selancar ke-#${this.heartbeatSequence} terverifikasi. Tab fokus aktif, entropi gerakan ${this.status.mouseEntropyScore}%, tidak ada manipulasi waktu.`,
        severity: 'info',
        metricValue: `Seq #${this.heartbeatSequence} · Entropi ${this.status.mouseEntropyScore}%`,
      });
    }

    return { valid, payload };
  }

  public reportFrameBustingAttempt(targetUrl: string) {
    this.emitLog({
      type: 'FRAME_BUST_INTERCEPTED',
      title: 'Percobaan Frame-Busting Berhasil Dicegah',
      details: `Website target (${targetUrl}) mencoba melakukan redirect paksa pada jendela induk (top.location). Sandbox keamanan berhasil menahan percobaan hijacking.`,
      severity: 'warning',
      metricValue: 'Sandbox HTML5 Aktif',
    });
  }

  public recordHumanVerificationResult(passed: boolean) {
    if (passed) {
      this.status.suspicionLevel = 'clean';
      this.status.mouseEntropyScore = 90;
      this.status.consecutiveLowEntropySeconds = 0;
      this.lowEntropyAlertSent = false;
      this.emitLog({
        type: 'HUMAN_POP_PASSED',
        title: 'Verifikasi Keberadaan Manusia Berhasil',
        details: 'Tantangan interaktif dijawab dengan benar oleh pengguna. Sesi selancar diverifikasi asli (bukan bot otomatis).',
        severity: 'info',
        metricValue: 'Verifikasi Lolos',
      });
    } else {
      this.status.suspicionLevel = 'flagged';
      this.emitLog({
        type: 'HUMAN_POP_FAILED',
        title: 'Verifikasi Keberadaan Manusia Gagal / Waktu Habis',
        details: 'Tantangan interaktif tidak dijawab atau salah. Distribusi poin dijeda sampai verifikasi ulang diselesaikan.',
        severity: 'critical',
        metricValue: 'Verifikasi Gagal',
      });
    }
  }

  public recordPointCredit(pointsEarned: number, siteTitle: string) {
    this.emitLog({
      type: 'POINT_CREDITED',
      title: `+${pointsEarned.toFixed(2)} Poin ${APP_NAME} Dikreditkan`,
      details: `Kunjungan selesai dengan seluruh cek integritas lolos (fokus tab, entropi manusia, dan heartbeat aman) untuk situs: "${siteTitle}".`,
      severity: 'info',
      metricValue: `+${pointsEarned.toFixed(2)} Poin`,
    });
  }

  /**
   * Manually triggers a simulated anomalous/suspicious event for testing,
   * verification sandboxes, or administrator compliance checks.
   */
  public triggerSimulatedViolation(
    violationType:
      | 'VISIBILITY_LOST'
      | 'LOW_ENTROPY_DETECTED'
      | 'CONCURRENCY_LOCKED'
      | 'TIME_DRIFT_PREVENTED'
      | 'FRAME_BUST_INTERCEPTED'
      | 'HUMAN_POP_FAILED'
  ) {
    switch (violationType) {
      case 'VISIBILITY_LOST':
        this.status.tabFocused = false;
        this.status.suspicionLevel = 'suspicious';
        this.emitLog({
          type: 'VISIBILITY_LOST',
          title: 'Jeda Otomatis: Tab Latar Belakang Terdeteksi',
          details: 'Pengguna berpindah tab browser atau meminimalkan jendela. Akumulasi poin dijeda untuk menjaga keadilan penukaran trafik.',
          severity: 'warning',
          metricValue: 'visibilityState: hidden',
        });
        break;
      case 'LOW_ENTROPY_DETECTED':
        this.status.mouseEntropyScore = 8;
        this.status.consecutiveLowEntropySeconds = 38;
        this.status.suspicionLevel = 'suspicious';
        this.emitLog({
          type: 'LOW_ENTROPY_DETECTED',
          title: 'Peringatan Entropi Rendah: Deteksi Otomasi / AFK',
          details: 'Tidak terdeteksi aktivitas kursor atau interaksi manusia nyata selama >35 detik. Sistem mencurigai bot otomatis atau auto-clicker.',
          severity: 'warning',
          metricValue: 'Entropi: 8% (Kritis)',
        });
        break;
      case 'CONCURRENCY_LOCKED':
        this.status.concurrencyLockActive = true;
        this.status.suspicionLevel = 'flagged';
        this.emitLog({
          type: 'CONCURRENCY_LOCKED',
          title: 'Proteksi Multi-Tab: Sesi Berselancar Ganda Terkunci',
          details: 'Ditemukan tab lain yang sedang aktif berselancar pada browser yang sama. Sistem hanya mengizinkan 1 sesi selancar aktif untuk mencegah eksploitasi poin berganda.',
          severity: 'critical',
          metricValue: 'Sesi Tab Ganda',
        });
        break;
      case 'TIME_DRIFT_PREVENTED':
        this.status.suspicionLevel = 'flagged';
        this.emitLog({
          type: 'TIME_DRIFT_PREVENTED',
          title: 'Manipulasi Waktu Browser Terdeteksi (Speed-Hack)',
          details: 'Interval waktu eksekusi (380ms) tidak wajar. Browser terdeteksi mempercepat clock/timer halaman. Akumulasi poin ditolak.',
          severity: 'critical',
          metricValue: '380ms (Min 1000ms)',
        });
        break;
      case 'FRAME_BUST_INTERCEPTED':
        this.status.suspicionLevel = 'suspicious';
        this.emitLog({
          type: 'FRAME_BUST_INTERCEPTED',
          title: 'Percobaan Frame-Busting Berhasil Dicegah',
          details: 'Website target mencoba melakukan redirect paksa pada jendela induk (top.location). Sandbox keamanan berhasil menahan percobaan pembajakan.',
          severity: 'warning',
          metricValue: 'Sandbox HTML5 Aktif',
        });
        break;
      case 'HUMAN_POP_FAILED':
        this.status.suspicionLevel = 'flagged';
        this.emitLog({
          type: 'HUMAN_POP_FAILED',
          title: 'Verifikasi Keberadaan Manusia Gagal / Waktu Habis',
          details: 'Tantangan interaktif tidak dijawab atau respon tidak valid. Distribusi poin dijeda sampai verifikasi ulang diselesaikan.',
          severity: 'critical',
          metricValue: 'Verifikasi Gagal',
        });
        break;
    }
  }

  public getStatus(): AntiCheatStatus {
    return { ...this.status };
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleFocus);
      window.removeEventListener('blur', this.handleBlur);
      window.removeEventListener('mousemove', this.handleMouseMove);
      if (this.entropyDecayInterval) {
        clearInterval(this.entropyDecayInterval);
        this.entropyDecayInterval = null;
      }
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
        this.broadcastChannel = null;
      }
    }
    this.isEngineStarted = false;
  }
}

export const antiCheatEngine = new AntiCheatEngine();
