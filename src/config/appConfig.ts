/**
 * Central Application Branding & Configuration
 * 
 * Edit this file (or set environment variables in .env) to easily change
 * the Application Name, Tagline, and brand identity across all pages and sections.
 */

export interface AppConfig {
  /** Short brand name displayed in header, logo, buttons, and titles (e.g. 'Trafik', 'WebSurfer') */
  name: string;
  /** Full brand name used in formal titles & badges (e.g. 'TrafikNusantara') */
  fullName: string;
  /** Main app tagline */
  tagline: string;
  /** Short description */
  description: string;
  /** Application version */
  version: string;
  /** Copyright year */
  year: number;
  /** Legal entity / merchant name */
  legalEntity: string;
  /** Support contact email */
  supportEmail: string;
  /** Domain or website URL */
  url: string;
  /** Feature flag to enable/disable paid packages & VIP upgrade flows (Phase 2 Xendit) */
  paymentsEnabled: boolean;
}

export const APP_CONFIG: AppConfig = {
  name: import.meta.env.VITE_APP_NAME || 'Trafik',
  fullName: import.meta.env.VITE_APP_FULL_NAME || 'Trafik',
  tagline: import.meta.env.VITE_APP_TAGLINE || 'Platform Pertukaran Trafik Website Indonesia',
  description:
    'Platform pertukaran trafik website Indonesia dengan sistem anti-curang canggih untuk distribusi poin yang adil dan penargetan audiens lokal.',
  version: '3.4.0',
  year: new Date().getFullYear(),
  legalEntity: 'Trafik Nusantara Digital',
  supportEmail: 'bantuan@trafik.id',
  url: 'https://trafiknusantara.id',
  paymentsEnabled: import.meta.env.VITE_PAYMENTS_ENABLED === 'true',
};

/**
 * Convenient direct variable for the primary App Name
 * Example usage:
 *   import { APP_NAME } from '../config/appConfig';
 *   <h1>Welcome to {APP_NAME}</h1>
 */
export const APP_NAME = APP_CONFIG.name;

/**
 * Central switch for paid point packages & VIP upgrade UI.
 * Keep false during Free Launch Mode; flip to true when Xendit QRIS & BCA VA is live.
 */
export const PAYMENTS_ENABLED = APP_CONFIG.paymentsEnabled;

/**
 * Helper to generate page document titles consistently
 */
export const getPageTitle = (subpage?: string): string => {
  if (!subpage) return `${APP_NAME} - ${APP_CONFIG.tagline}`;
  return `${subpage} | ${APP_NAME}`;
};
