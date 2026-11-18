import { UserProfile } from '../types';

export interface WordPressAuthResponse {
  token?: string;
  user_email?: string;
  user_nicename?: string;
  user_display_name?: string;
  roles?: string[];
  id?: number;
}

export interface WordPressConnectionConfig {
  wpUrl: string; // e.g. https://velocity.web.id
  authMode: 'jwt' | 'app_password' | 'cookie' | 'simulated';
  jwtEndpoint: string; // e.g. /wp-json/jwt-auth/v1/token
  userMetaKey: string; // e.g. tn_traffic_points
  autoSyncPoints: boolean;
}

const DEFAULT_CONFIG: WordPressConnectionConfig = {
  wpUrl: 'https://velocity.web.id',
  authMode: 'simulated',
  jwtEndpoint: '/wp-json/jwt-auth/v1/token',
  userMetaKey: 'tn_traffic_points',
  autoSyncPoints: true,
};

class WordPressAuthService {
  private config: WordPressConnectionConfig = DEFAULT_CONFIG;
  private token: string | null = null;

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const savedConfig = localStorage.getItem('tn_wp_config');
      if (savedConfig) {
        try {
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
        } catch {
          // ignore
        }
      }
      this.token = localStorage.getItem('tn_wp_jwt_token');
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

  /**
   * Attempts authentication against the WordPress REST API endpoint
   * @param username WordPress username or email
   * @param password WordPress password or Application Password
   */
  public async loginWithWordPress(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: Partial<UserProfile>; message: string }> {
    // If in simulated mode or testing mode without live CORS setup:
    if (this.config.authMode === 'simulated') {
      await new Promise((r) => setTimeout(r, 800)); // simulate network latency

      const isAdmin =
        username.toLowerCase().includes('admin') ||
        username.toLowerCase() === 'admin@velocity.web.id';

      const mockWpUser: Partial<UserProfile> = {
        name: isAdmin ? 'Admin Velocity WordPress' : username.split('@')[0],
        email: username.includes('@') ? username : `${username}@velocity.web.id`,
        role: isAdmin ? 'admin' : 'user',
        membership: isAdmin ? 'pro_nusantara' : 'gratis',
        surfRatio: isAdmin ? 1.0 : 0.7,
        lastActive: 'Terhubung via WordPress REST API',
      };

      return {
        success: true,
        user: mockWpUser,
        message: `Berhasil login menggunakan akun WordPress ${this.config.wpUrl}!`,
      };
    }

    // Live HTTP Request to WordPress REST API
    try {
      const endpoint = `${this.config.wpUrl.replace(/\/$/, '')}${this.config.jwtEndpoint}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message:
            errorData.message ||
            `Gagal login ke WordPress: Status ${response.status}. Periksa username/password atau plugin JWT di WordPress.`,
        };
      }

      const data: WordPressAuthResponse = await response.json();
      if (data.token) {
        this.token = data.token;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('tn_wp_jwt_token', data.token);
        }
      }

      const isAdmin = (data.roles || []).includes('administrator');

      const wpProfile: Partial<UserProfile> = {
        name: data.user_display_name || data.user_nicename || username,
        email: data.user_email || username,
        role: isAdmin ? 'admin' : 'user',
        membership: isAdmin ? 'pro_nusantara' : 'gratis',
        surfRatio: isAdmin ? 1.0 : 0.7,
        lastActive: 'Sinkronisasi WordPress Aktif',
      };

      return {
        success: true,
        user: wpProfile,
        message: 'Koneksi ke WordPress berhasil! Sesi autentikasi telah disinkronkan.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal menghubungi WordPress (${err.message || 'CORS / Network Error'}). Pastikan plugin JWT / Application Passwords aktif dan CORS diizinkan di WordPress.`,
      };
    }
  }

  /**
   * Tests connection to WordPress site REST API root (/wp-json/)
   */
  public async testWordPressConnection(): Promise<{
    reachable: boolean;
    siteName?: string;
    description?: string;
    message: string;
  }> {
    try {
      const endpoint = `${this.config.wpUrl.replace(/\/$/, '')}/wp-json/`;
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) {
        return {
          reachable: false,
          message: `Server WordPress merespons dengan status ${response.status}`,
        };
      }
      const data = await response.json();
      return {
        reachable: true,
        siteName: data.name || 'WordPress Site',
        description: data.description || '',
        message: 'Endpoint WP REST API aktif dan dapat diakses!',
      };
    } catch (err: any) {
      return {
        reachable: false,
        message: `Tidak dapat menjangkau ${this.config.wpUrl}/wp-json/. Pesan: ${err.message || 'CORS / Offline'}.`,
      };
    }
  }

  public logout() {
    this.token = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tn_wp_jwt_token');
    }
  }
}

export const wpAuthService = new WordPressAuthService();
