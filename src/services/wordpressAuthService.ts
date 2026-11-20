import { UserProfile, WebsiteCampaign, AntiCheatLogEntry, WebsiteProbeResult, GeoStatus } from '../types';

export type WordPressAuthMode = 'bridge' | 'simulated';

export interface WordPressConnectionConfig {
  wpUrl: string; // e.g. https://velocity.web.id
  authMode: WordPressAuthMode;
  userMetaKey: string; // e.g. tn_traffic_points
  autoSyncPoints: boolean;
}

export interface BridgeHealthResponse {
  reachable: boolean;
  pluginInstalled: boolean;
  dbReady?: boolean;
  siteName?: string;
  wpVersion?: string;
  version?: string;
  counts?: {
    campaigns: number;
    logs: number;
    users: number;
  };
  message: string;
}

const isHostedProduction =
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('velocity.web.id');

const DEFAULT_CONFIG: WordPressConnectionConfig = {
  wpUrl: 'https://velocity.web.id',
  authMode: isHostedProduction ? 'bridge' : 'simulated',
  userMetaKey: 'tn_traffic_points',
  autoSyncPoints: true,
};

class WordPressAuthService {
  private config: WordPressConnectionConfig = DEFAULT_CONFIG;
  private token: string | null = null;
  private adminReturnToken: string | null = null;
  private lastGeoStatus: GeoStatus | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const savedConfig = localStorage.getItem('tn_wp_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          const normalizedMode: WordPressAuthMode =
            parsed.authMode === 'bridge' || parsed.authMode === 'jwt' || parsed.authMode === 'app_password'
              ? 'bridge'
              : 'simulated';
          this.config = {
            ...DEFAULT_CONFIG,
            ...parsed,
            authMode: normalizedMode,
          };
        } catch {
          // ignore invalid saved config
        }
      }
      this.token = localStorage.getItem('tn_wp_jwt_token');
      this.adminReturnToken = localStorage.getItem('tn_wp_admin_return_token');
    }
  }

  public getConfig(): WordPressConnectionConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<WordPressConnectionConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tn_wp_config', JSON.stringify(this.config));
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isLiveBridgeActive(): boolean {
    return this.config.authMode === 'bridge' && Boolean(this.token);
  }

  private getApiBase(): string {
    return `${this.config.wpUrl.replace(/\/$/, '')}/wp-json/trafik/v1`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    requireAuth = true
  ): Promise<{ ok: boolean; status: number; data?: T; error?: string; code?: string; geoStatus?: GeoStatus }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (requireAuth && this.token) {
      headers['X-Trafik-Token'] = this.token;
    }

    try {
      const res = await fetch(`${this.getApiBase()}${path}`, {
        ...options,
        headers,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          error: json.message || `Error HTTP ${res.status}`,
          code: json.code,
          geoStatus: json.data?.geoStatus,
        };
      }
      return { ok: true, status: res.status, data: json as T };
    } catch (err: any) {
      return {
        ok: false,
        status: 0,
        error: err?.message || 'Tidak dapat menjangkau server WordPress (CORS / Network Error).',
      };
    }
  }

  public getCachedGeoStatus(): GeoStatus | null {
    return this.lastGeoStatus;
  }

  public async checkGeoAccess(forceRefresh = false): Promise<GeoStatus> {
    if (
      !forceRefresh &&
      this.lastGeoStatus &&
      this.lastGeoStatus.checkedAt &&
      Date.now() - this.lastGeoStatus.checkedAt < 60_000
    ) {
      return this.lastGeoStatus;
    }

    if (this.config.authMode === 'simulated') {
      const sim: GeoStatus = {
        allowed: true,
        countryCode: 'ID',
        countryName: 'Indonesia (Mode Simulasi)',
        isProxy: false,
        adminBypass: false,
        message: 'Koneksi Indonesia terverifikasi.',
        checkedAt: Date.now(),
      };
      this.lastGeoStatus = sim;
      return sim;
    }

    const res = await this.request<GeoStatus>('/geo/check', { method: 'GET' }, true);
    if (res.ok && res.data) {
      const status: GeoStatus = { ...res.data, checkedAt: Date.now() };
      this.lastGeoStatus = status;
      return status;
    }

    return {
      allowed: true,
      countryCode: 'ID',
      countryName: 'Indonesia',
      isProxy: false,
      adminBypass: false,
      message: res.error || 'Pemeriksaan wilayah dilewati sementara.',
      checkedAt: Date.now(),
    };
  }

  /**
   * Login via WordPress Plugin Bridge (/wp-json/trafik/v1/auth/login)
   */
  public async loginWithWordPress(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; geoStatus?: GeoStatus; geoBlocked?: boolean; message: string }> {
    if (this.config.authMode === 'simulated') {
      await new Promise((r) => setTimeout(r, 500));

      const isAdmin =
        username.toLowerCase().includes('admin') ||
        username.toLowerCase() === 'admin@velocity.web.id';

      const mockWpUser: UserProfile = {
        id: isAdmin ? 'usr_wp_admin' : 'usr_wp_' + Math.random().toString(36).substring(2, 7),
        name: isAdmin ? 'Admin Velocity WordPress' : username.split('@')[0],
        email: username.includes('@') ? username : `${username}@velocity.web.id`,
        role: isAdmin ? 'admin' : 'user',
        status: 'active',
        city: 'Indonesia',
        points: isAdmin ? 5000 : 1500,
        membership: isAdmin ? 'pro_nusantara' : 'gratis',
        surfRatio: isAdmin ? 1.0 : 0.7,
        totalHitsGiven: 0,
        totalHitsReceived: 0,
        dailySurfedSeconds: 0,
        dailyTargetSeconds: 1800,
        streakDays: 1,
        referralCode: 'WP-' + (username.split('@')[0] || 'USER').substring(0, 4).toUpperCase(),
        referredCount: 0,
        referralPointsEarned: 0,
        websiteSlots: isAdmin ? 20 : 3,
        joinedDate: new Date().toISOString().split('T')[0],
        lastActive: 'Mode Simulasi WordPress',
      };

      return {
        success: true,
        user: mockWpUser,
        message: `Berhasil login simulasi sebagai akun WordPress ${this.config.wpUrl}!`,
      };
    }

    const res = await this.request<{ success: boolean; token: string; user: UserProfile; geoStatus?: GeoStatus }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      },
      false
    );

    if (!res.ok || !res.data?.token) {
      if (res.geoStatus) {
        this.lastGeoStatus = { ...res.geoStatus, checkedAt: Date.now() };
      }
      return {
        success: false,
        geoBlocked: res.code === 'geo_blocked' || res.status === 403,
        geoStatus: res.geoStatus,
        message: res.error || 'Gagal login ke WordPress Plugin Bridge.',
      };
    }

    this.token = res.data.token;
    if (res.data.geoStatus) {
      this.lastGeoStatus = { ...res.data.geoStatus, checkedAt: Date.now() };
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tn_wp_jwt_token', res.data.token);
    }

    return {
      success: true,
      user: res.data.user,
      geoStatus: res.data.geoStatus,
      message: res.data.geoStatus?.adminBypass
        ? 'Login Administrator berhasil (Geo-Bypass aktif).'
        : 'Login WordPress berhasil! Data tersinkronisasi langsung dengan MySQL.',
    };
  }

  /**
   * Register new WordPress subscriber account via Bridge
   */
  public async registerWithWordPress(
    name: string,
    email: string,
    password: string,
    city = 'Indonesia'
  ): Promise<{ success: boolean; user?: UserProfile; geoStatus?: GeoStatus; geoBlocked?: boolean; message: string }> {
    if (this.config.authMode === 'simulated') {
      return {
        success: false,
        message: 'Pendaftaran akun WordPress nyata hanya tersedia pada mode Live WordPress Plugin Bridge.',
      };
    }

    const res = await this.request<{ success: boolean; token: string; user: UserProfile; geoStatus?: GeoStatus }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ name, email, password, city }),
      },
      false
    );

    if (!res.ok || !res.data?.token) {
      if (res.geoStatus) {
        this.lastGeoStatus = { ...res.geoStatus, checkedAt: Date.now() };
      }
      return {
        success: false,
        geoBlocked: res.code === 'geo_blocked' || res.status === 403,
        geoStatus: res.geoStatus,
        message: res.error || 'Gagal mendaftar akun ke WordPress.',
      };
    }

    this.token = res.data.token;
    if (res.data.geoStatus) {
      this.lastGeoStatus = { ...res.data.geoStatus, checkedAt: Date.now() };
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tn_wp_jwt_token', res.data.token);
    }

    return {
      success: true,
      user: res.data.user,
      geoStatus: res.data.geoStatus,
      message: 'Akun WordPress baru berhasil dibuat & tersinkronisasi dengan MySQL!',
    };
  }

  /**
   * Tests Plugin Bridge health (/wp-json/trafik/v1/health) with fallback to /wp-json/
   */
  public async testWordPressConnection(): Promise<BridgeHealthResponse> {
    const healthRes = await this.request<{
      ok: boolean;
      plugin: string;
      version: string;
      siteName: string;
      wpVersion: string;
      dbReady: boolean;
      counts?: { campaigns: number; logs: number; users: number };
    }>('/health', { method: 'GET' }, false);

    if (healthRes.ok && healthRes.data) {
      return {
        reachable: true,
        pluginInstalled: true,
        dbReady: healthRes.data.dbReady,
        siteName: healthRes.data.siteName,
        wpVersion: healthRes.data.wpVersion,
        version: healthRes.data.version,
        counts: healthRes.data.counts,
        message: healthRes.data.dbReady
          ? `Trafik WP Bridge v${healthRes.data.version} aktif! MySQL siap (${healthRes.data.counts?.users ?? 0} user, ${healthRes.data.counts?.campaigns ?? 0} kampanye).`
          : 'Plugin terdeteksi, namun tabel MySQL belum lengkap. Coba nonaktifkan & aktifkan ulang plugin di WP Admin.',
      };
    }

    // Fallback check to see if WordPress REST API root exists
    try {
      const rootEndpoint = `${this.config.wpUrl.replace(/\/$/, '')}/wp-json/`;
      const rootRes = await fetch(rootEndpoint, { method: 'GET' });
      if (rootRes.ok) {
        const rootJson = await rootRes.json().catch(() => ({}));
        return {
          reachable: true,
          pluginInstalled: false,
          siteName: rootJson.name || 'WordPress',
          message: `WordPress "${rootJson.name || this.config.wpUrl}" aktif, tetapi plugin Trafik WP Bridge belum terpasang/diaktifkan.`,
        };
      }
      return {
        reachable: false,
        pluginInstalled: false,
        message: `WordPress merespons status HTTP ${rootRes.status}.`,
      };
    } catch (err: any) {
      return {
        reachable: false,
        pluginInstalled: false,
        message: `Tidak dapat menjangkau ${this.config.wpUrl}. Pastikan domain online & CORS diizinkan (${err?.message || 'Network Error'}).`,
      };
    }
  }

  public async fetchMe(): Promise<UserProfile | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ user: UserProfile; geoStatus?: GeoStatus }>('/me', { method: 'GET' });
    if (res.ok && res.data) {
      if (res.data.geoStatus) {
        this.lastGeoStatus = { ...res.data.geoStatus, checkedAt: Date.now() };
      }
      return res.data.user;
    }
    return null;
  }

  public async updateMe(payload: {
    name?: string;
    city?: string;
    addPoints?: number;
    upgradeVip?: boolean;
  }): Promise<UserProfile | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ user: UserProfile }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.ok && res.data ? res.data.user : null;
  }

  public async completeSurf(payload: {
    siteId: string;
    earnedPoints: number;
    cost: number;
    durationSec?: number;
  }): Promise<{ user?: UserProfile; campaign?: WebsiteCampaign | null; geoBlocked?: boolean; error?: string } | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{
      success: boolean;
      user: UserProfile;
      campaign: WebsiteCampaign | null;
    }>('/surf/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return {
        geoBlocked: res.code === 'geo_blocked' || res.status === 403,
        error: res.error,
      };
    }
    return res.data ? { user: res.data.user, campaign: res.data.campaign } : null;
  }

  public async fetchWebsites(): Promise<{
    myWebsites: WebsiteCampaign[];
    communityWebsites: WebsiteCampaign[];
  } | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{
      myWebsites: WebsiteCampaign[];
      communityWebsites: WebsiteCampaign[];
    }>('/websites', { method: 'GET' });
    return res.ok && res.data ? res.data : null;
  }

  public async probeWebsite(
    url: string,
    title = ''
  ): Promise<WebsiteProbeResult | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<WebsiteProbeResult>('/websites/probe', {
      method: 'POST',
      body: JSON.stringify({ url, title }),
    });
    return res.ok && res.data ? res.data : null;
  }

  public async createWebsite(
    siteData: Omit<WebsiteCampaign, 'id' | 'createdAt' | 'hitsDeliveredToday' | 'totalHitsDelivered'>
  ): Promise<{ website?: WebsiteCampaign; user?: UserProfile; error?: string } | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ website: WebsiteCampaign; user: UserProfile }>('/websites', {
      method: 'POST',
      body: JSON.stringify(siteData),
    });
    if (!res.ok) {
      return { error: res.error || 'Gagal menyimpan website di server WordPress.' };
    }
    return res.data ? res.data : null;
  }

  public async updateWebsiteAction(
    siteId: string,
    payload: {
      action: 'toggle_status' | 'add_points' | 'report' | 'approve' | 'reject' | 'quarantine';
      amount?: number;
      reason?: string;
    }
  ): Promise<{ website: WebsiteCampaign; user: UserProfile } | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ website: WebsiteCampaign; user: UserProfile }>(
      `/websites/${encodeURIComponent(siteId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.ok && res.data ? res.data : null;
  }

  public async deleteWebsite(siteId: string): Promise<{ deleted: boolean; user: UserProfile } | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ deleted: boolean; user: UserProfile }>(
      `/websites/${encodeURIComponent(siteId)}`,
      { method: 'DELETE' }
    );
    return res.ok && res.data ? res.data : null;
  }

  public async fetchLogs(): Promise<AntiCheatLogEntry[] | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ logs: AntiCheatLogEntry[] }>('/logs', { method: 'GET' });
    return res.ok && res.data ? res.data.logs : null;
  }

  public async pushLog(entry: AntiCheatLogEntry): Promise<void> {
    if (!this.isLiveBridgeActive()) return;
    await this.request('/logs', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  public async fetchAdminUsers(): Promise<UserProfile[] | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ users: UserProfile[] }>('/admin/users', { method: 'GET' });
    return res.ok && res.data ? res.data.users : null;
  }

  public async createAdminUser(user: Partial<UserProfile> & { password?: string }): Promise<UserProfile | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ user: UserProfile }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    return res.ok && res.data ? res.data.user : null;
  }

  public async updateAdminUser(userId: string, updated: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!this.isLiveBridgeActive()) return null;
    const res = await this.request<{ user: UserProfile }>(
      `/admin/users/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updated),
      }
    );
    return res.ok && res.data ? res.data.user : null;
  }

  public hasAdminReturnToken(): boolean {
    return Boolean(this.adminReturnToken);
  }

  public async impersonateUser(
    userId: string
  ): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
    if (!this.isLiveBridgeActive()) {
      return { success: false, message: 'Live Bridge tidak aktif.' };
    }

    const currentAdminToken = this.adminReturnToken || this.token;
    const res = await this.request<{ success: boolean; token: string; user: UserProfile }>(
      '/admin/impersonate',
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }
    );

    if (!res.ok || !res.data?.token) {
      return {
        success: false,
        message: res.error || 'Gagal beralih sesi pengguna.',
      };
    }

    if (currentAdminToken && !this.adminReturnToken) {
      this.adminReturnToken = currentAdminToken;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tn_wp_admin_return_token', currentAdminToken);
      }
    }

    this.token = res.data.token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tn_wp_jwt_token', res.data.token);
    }

    return { success: true, user: res.data.user };
  }

  public async returnToAdminSession(): Promise<UserProfile | null> {
    if (!this.adminReturnToken) return null;
    this.token = this.adminReturnToken;
    this.adminReturnToken = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tn_wp_jwt_token', this.token);
      localStorage.removeItem('tn_wp_admin_return_token');
    }
    return this.fetchMe();
  }

  public logout() {
    this.token = null;
    this.adminReturnToken = null;
    this.lastGeoStatus = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tn_wp_jwt_token');
      localStorage.removeItem('tn_wp_admin_return_token');
    }
  }
}

export const wpAuthService = new WordPressAuthService();
