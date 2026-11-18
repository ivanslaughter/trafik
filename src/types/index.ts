export type IndonesianRegionId =
  | 'nasional'
  | 'jabodetabek'
  | 'jawa_barat'
  | 'jawa_timur'
  | 'jawa_tengah'
  | 'sumatera'
  | 'bali_nusra'
  | 'kalimantan'
  | 'sulawesi';

export type DeviceType = 'all' | 'desktop' | 'mobile';

export type WebsiteCategory =
  | 'blog'
  | 'ecommerce'
  | 'youtube'
  | 'portfolio'
  | 'news'
  | 'education';

export type WebsiteAuditStatus = 'pending' | 'approved' | 'flagged' | 'rejected';

export type ComplianceViolationCategory = 'JUDI_ONLINE' | 'ADULT_18_PLUS' | 'PHISHING_MALWARE' | 'FRAME_BREAKER';

export interface AuditEvaluation {
  passed: boolean;
  riskScore: number; // 0 - 100
  violations: ComplianceViolationCategory[];
  detectedKeywords: string[];
  reason: string;
  auditTimestamp: string;
}

export interface WebsiteProbeResult {
  reachable: boolean;
  httpStatus: number;
  iframeAllowed: boolean;
  frameReason: string;
  fetchedTitle?: string;
  fetchedDescription?: string;
  compliance: AuditEvaluation;
}

export interface WebsiteCampaign {
  id: string;
  title: string;
  url: string;
  category: WebsiteCategory;
  durationSec: number; // 15, 30, 45, 60
  targetRegion: IndonesianRegionId;
  targetDevice: DeviceType;
  pointsCostPerVisit: number;
  dailyHitLimit: number;
  hitsDeliveredToday: number;
  totalHitsDelivered: number;
  allocatedPoints: number;
  status: 'active' | 'paused' | 'depleted';
  createdAt: string;
  // Hybrid Surf & Analytics Fields
  iframeAllowed?: boolean; // true = loads in live iframe; false = requires controlled surf tab fallback
  referrerPolicy?: 'direct' | 'referral'; // 'direct' sets no-referrer; 'referral' passes trafik.velocity.web.id
  // Compliance & Anti-Judi/18+ Audit Fields
  auditStatus: WebsiteAuditStatus;
  auditScore: number; // 0 = 100% safe, 100 = critical violation
  auditViolations?: ComplianceViolationCategory[];
  detectedKeywords?: string[];
  auditNotes?: string;
  reportedCount: number;
  submittedByUserId?: string;
  // Fallback metadata summary when previewing offline/sample sites
  previewContent?: {
    headline: string;
    description: string;
    author: string;
    city: string;
    tags: string[];
    bodySnippet: string;
    imageUrl?: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  suspendReason?: string;
  city: string;
  points: number;
  membership: 'gratis' | 'pro_nusantara';
  surfRatio: number; // 0.7 for free (70%), 1.0 for pro (100%)
  totalHitsGiven: number;
  totalHitsReceived: number;
  dailySurfedSeconds: number;
  dailyTargetSeconds: number;
  streakDays: number;
  referralCode: string;
  referredCount: number;
  referralPointsEarned: number;
  websiteSlots: number;
  joinedDate: string;
  lastActive: string;
}

export type AntiCheatSeverity = 'info' | 'warning' | 'critical';

export interface AntiCheatLogEntry {
  id: string;
  timestamp: number;
  type:
    | 'HEARTBEAT_VERIFIED'
    | 'VISIBILITY_LOST'
    | 'VISIBILITY_RESTORED'
    | 'LOW_ENTROPY_DETECTED'
    | 'HUMAN_POP_PASSED'
    | 'HUMAN_POP_FAILED'
    | 'TIME_DRIFT_PREVENTED'
    | 'FRAME_BUST_INTERCEPTED'
    | 'CONCURRENCY_LOCKED'
    | 'POINT_CREDITED';
  title: string;
  details: string;
  severity: AntiCheatSeverity;
  metricValue?: string;
}

export interface AntiCheatStatus {
  tabFocused: boolean;
  mouseEntropyScore: number; // 0 to 100
  heartbeatSync: boolean;
  concurrencyLockActive: boolean;
  frameShieldActive: boolean;
  lastHeartbeatTime: number;
  suspicionLevel: 'clean' | 'suspicious' | 'flagged';
  consecutiveLowEntropySeconds: number;
}

export interface SurfSessionState {
  isActive: boolean;
  currentSiteIndex: number;
  remainingSeconds: number;
  targetDurationSeconds: number;
  isPaused: boolean;
  pauseReason: 'none' | 'tab_inactive' | 'pop_challenge' | 'user_pause' | 'concurrency';
  sessionPointsEarned: number;
  sessionSitesVisited: number;
  autoSurfing: boolean;
  soundEnabled: boolean;
}
