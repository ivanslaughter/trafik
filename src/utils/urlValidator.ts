import { auditWebsiteCompliance } from '../services/complianceAuditEngine';
import { wpAuthService } from '../services/wordpressAuthService';
import { AuditEvaluation } from '../types';

export type ValidationCheckStatus = 'idle' | 'checking' | 'pass' | 'fail' | 'skipped';

export interface DomainValidationResult {
  valid: boolean;
  normalizedUrl: string;
  hostname: string;
  message: string;
}

export interface HeadStatusCheckResult {
  ok200: boolean;
  reachable: boolean;
  statusCode: number;
  statusText?: string;
  method?: string;
  latencyMs?: number;
  finalUrl?: string;
  source: 'wp_api' | 'local_api' | 'direct_head';
  message: string;
}

export interface ClientUrlValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  hostname: string;
  domain: {
    status: ValidationCheckStatus;
    message: string;
  };
  reachability: {
    status: ValidationCheckStatus;
    message: string;
    statusCode?: number;
    statusText?: string;
    method?: string;
    latencyMs?: number;
    source?: 'wp_api' | 'local_api' | 'direct_head';
  };
  policy: {
    status: ValidationCheckStatus;
    message: string;
    audit?: AuditEvaluation;
  };
  errorMessage: string;
  detectedKeywords: string[];
}

const DISALLOWED_LOCAL_TLDS = [
  '.local',
  '.localhost',
  '.internal',
  '.lan',
  '.home',
  '.corp',
  '.intranet',
  '.test',
  '.example',
  '.invalid',
];

const DISALLOWED_FILE_EXTENSIONS = [
  '.exe',
  '.msi',
  '.apk',
  '.bat',
  '.cmd',
  '.scr',
  '.dmg',
  '.sh',
  '.dll',
  '.iso',
];

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const DNS_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const VALID_TLD_REGEX = /^(?:[a-z]{2,24}|xn--[a-z0-9-]{2,59})$/i;

/**
 * Validates URL syntax, protocol, FQDN domain structure, and safety constraints client-side.
 */
export function validateUrlDomain(
  rawUrl: string,
  options?: { existingUrls?: string[] }
): DomainValidationResult {
  const trimmed = rawUrl.trim();

  if (!trimmed || trimmed === 'https://' || trimmed === 'http://') {
    return {
      valid: false,
      normalizedUrl: trimmed,
      hostname: '',
      message: 'Masukkan alamat URL lengkap beserta nama domain (contoh: https://domainanda.id).',
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      normalizedUrl: trimmed,
      hostname: '',
      message: 'URL tidak boleh mengandung spasi.',
    };
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      normalizedUrl: trimmed,
      hostname: '',
      message: 'URL harus diawali dengan protokol https:// atau http://.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalizedUrl: trimmed,
      hostname: '',
      message: 'Format URL tidak valid. Periksa kembali penulisan domain Anda.',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      normalizedUrl: trimmed,
      hostname: '',
      message: 'Hanya protokol HTTP atau HTTPS yang diizinkan.',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      normalizedUrl: trimmed,
      hostname: '',
      message: 'URL tidak boleh menyertakan kredensial login (user:password@).',
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');

  if (!hostname || hostname.length > 253) {
    return {
      valid: false,
      normalizedUrl: parsed.href,
      hostname,
      message: 'Nama domain tidak valid atau terlalu panjang.',
    };
  }

  if (
    hostname === 'localhost' ||
    hostname.startsWith('[') ||
    hostname.includes(':') ||
    IPV4_REGEX.test(hostname) ||
    DISALLOWED_LOCAL_TLDS.some((tld) => hostname.endsWith(tld))
  ) {
    return {
      valid: false,
      normalizedUrl: parsed.href,
      hostname,
      message: 'Domain lokal, localhost, atau alamat IP langsung tidak diperbolehkan. Gunakan domain publik yang valid.',
    };
  }

  // Prevent infinite autosurf loop on the portal's own domain
  if (typeof window !== 'undefined' && window.location.hostname) {
    const portalHost = window.location.hostname.toLowerCase();
    if (hostname === portalHost && portalHost !== 'localhost') {
      return {
        valid: false,
        normalizedUrl: parsed.href,
        hostname,
        message: 'Tidak dapat mendaftarkan domain portal pertukaran trafik sendiri.',
      };
    }
  }

  const labels = hostname.split('.');
  if (labels.length < 2) {
    return {
      valid: false,
      normalizedUrl: parsed.href,
      hostname,
      message: 'Domain harus memiliki ekstensi TLD yang valid (contoh: .id, .co.id, .com).',
    };
  }

  for (const label of labels) {
    if (!DNS_LABEL_REGEX.test(label)) {
      return {
        valid: false,
        normalizedUrl: parsed.href,
        hostname,
        message: `Struktur domain "${hostname}" tidak valid. Gunakan huruf, angka, dan tanda hubung yang benar.`,
      };
    }
  }

  const tld = labels[labels.length - 1];
  if (!VALID_TLD_REGEX.test(tld)) {
    return {
      valid: false,
      normalizedUrl: parsed.href,
      hostname,
      message: `Ekstensi domain ".${tld}" tidak valid.`,
    };
  }

  const pathnameLower = parsed.pathname.toLowerCase();
  if (DISALLOWED_FILE_EXTENSIONS.some((ext) => pathnameLower.endsWith(ext))) {
    return {
      valid: false,
      normalizedUrl: parsed.href,
      hostname,
      message: 'URL tidak boleh mengarah langsung ke file unduhan berbahaya (.exe, .apk, .msi, dll).',
    };
  }

  // Check duplicate registration against user's other active campaigns
  if (options?.existingUrls && options.existingUrls.length > 0) {
    const normalizedCandidate = normalizeComparableUrl(parsed.href);
    const isDuplicate = options.existingUrls.some(
      (existing) => normalizeComparableUrl(existing) === normalizedCandidate
    );
    if (isDuplicate) {
      return {
        valid: false,
        normalizedUrl: parsed.href,
        hostname,
        message: 'URL ini sudah terdaftar di daftar kampanye website Anda.',
      };
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.href,
    hostname,
    message: `Domain publik "${hostname}" valid.`,
  };
}

function normalizeComparableUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const path = u.pathname.replace(/\/+$/, '') || '';
    return `${u.hostname.toLowerCase()}${path}${u.search}`;
  } catch {
    return raw.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Verifies exact HTTP 200 OK response by sending an HTTP HEAD request through the backend API:
 * 1) WordPress Bridge API (POST /wp-json/trafik/v1/websites/head-check) when bridge mode is enabled
 * 2) Local Express API (POST /api/websites/head-check)
 * 3) Direct CORS HEAD request fallback if neither API endpoint is available
 */
export async function checkUrlHeadStatusViaApi(
  normalizedUrl: string,
  hostname: string,
  timeoutMs = 9500
): Promise<HeadStatusCheckResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok200: false,
      reachable: false,
      statusCode: 0,
      source: 'local_api',
      message: 'Perangkat Anda sedang offline. Periksa koneksi internet untuk memverifikasi status HTTP 200 OK.',
    };
  }

  // 1. Try WordPress Bridge API first if configured in bridge mode
  if (wpAuthService.getConfig().authMode === 'bridge') {
    const wpHead = await wpAuthService.checkUrlHeadStatus(normalizedUrl);
    if (wpHead) {
      return {
        ok200: Boolean(wpHead.ok200 && wpHead.statusCode === 200),
        reachable: Boolean(wpHead.reachable),
        statusCode: wpHead.statusCode || 0,
        statusText: wpHead.statusText,
        method: wpHead.method || 'HEAD',
        latencyMs: wpHead.latencyMs,
        finalUrl: wpHead.finalUrl || normalizedUrl,
        source: 'wp_api',
        message: wpHead.message,
      };
    }
  }

  // 2. Try local Express API endpoint (/api/websites/head-check)
  const apiController = new AbortController();
  const apiTimer = setTimeout(() => apiController.abort(), timeoutMs);
  try {
    const apiRes = await fetch('/api/websites/head-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ url: normalizedUrl }),
      signal: apiController.signal,
    });

    const contentType = apiRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await apiRes.json()) as {
        ok200?: boolean;
        reachable?: boolean;
        statusCode?: number;
        statusText?: string;
        method?: string;
        latencyMs?: number;
        finalUrl?: string;
        message?: string;
      };

      const statusCode = Number(data.statusCode || 0);
      const ok200 = Boolean(data.ok200 && statusCode === 200);
      return {
        ok200,
        reachable: Boolean(data.reachable),
        statusCode,
        statusText: data.statusText,
        method: data.method || 'HEAD',
        latencyMs: data.latencyMs,
        finalUrl: data.finalUrl || normalizedUrl,
        source: 'local_api',
        message:
          data.message ||
          (ok200
            ? `Server merespons HTTP 200 OK via HEAD.`
            : `Server merespons HTTP ${statusCode || 'Error'} — hanya domain dengan status 200 OK yang dapat didaftarkan.`),
      };
    }
  } catch {
    // Fall through to direct CORS HEAD check if local API route isn't hosted
  } finally {
    clearTimeout(apiTimer);
  }

  // 3. Direct browser HEAD fallback (only passes if CORS allows reading exact status === 200)
  const directController = new AbortController();
  const directTimer = setTimeout(() => directController.abort(), 6000);
  const startedAt = performance.now();
  try {
    const res = await fetch(normalizedUrl, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: directController.signal,
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
    const ok200 = res.status === 200;
    return {
      ok200,
      reachable: true,
      statusCode: res.status,
      statusText: res.statusText || (ok200 ? 'OK' : ''),
      method: 'HEAD',
      latencyMs,
      finalUrl: res.url || normalizedUrl,
      source: 'direct_head',
      message: ok200
        ? `Server merespons HTTP 200 OK via HEAD (${latencyMs} ms).`
        : `Server merespons HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''} — hanya domain dengan status 200 OK yang dapat didaftarkan.`,
    };
  } catch {
    return {
      ok200: false,
      reachable: false,
      statusCode: 0,
      method: 'HEAD',
      source: 'direct_head',
      message: `Tidak dapat memverifikasi status HTTP 200 OK untuk "${hostname}". Pastikan API server aktif atau domain dapat diakses.`,
    };
  } finally {
    clearTimeout(directTimer);
  }
}

/**
 * Full 3-stage URL validator for WebsitesManager:
 * 1) Domain & URL syntax validation (client-side)
 * 2) Content policy compliance check (Anti-Judi Online & Anti-18+)
 * 3) HTTP HEAD status 200 OK verification via API
 */
export async function validateWebsiteUrlClientSide(
  rawUrl: string,
  title: string,
  options?: {
    checkReachability?: boolean;
    existingUrls?: string[];
  }
): Promise<ClientUrlValidationResult> {
  const domainCheck = validateUrlDomain(rawUrl, { existingUrls: options?.existingUrls });

  // Always run content policy check so violations are surfaced immediately
  const audit = auditWebsiteCompliance(domainCheck.normalizedUrl || rawUrl, title);

  if (!domainCheck.valid) {
    return {
      isValid: false,
      normalizedUrl: domainCheck.normalizedUrl,
      hostname: domainCheck.hostname,
      domain: { status: 'fail', message: domainCheck.message },
      policy: {
        status: audit.passed ? 'pass' : 'fail',
        message: audit.passed
          ? 'Tidak terdeteksi pelanggaran konten pada URL/judul.'
          : audit.reason,
        audit,
      },
      reachability: {
        status: 'skipped',
        message: 'Menunggu format domain valid sebelum pemeriksaan HTTP HEAD.',
      },
      errorMessage: !audit.passed ? audit.reason : domainCheck.message,
      detectedKeywords: audit.detectedKeywords,
    };
  }

  if (!audit.passed) {
    return {
      isValid: false,
      normalizedUrl: domainCheck.normalizedUrl,
      hostname: domainCheck.hostname,
      domain: { status: 'pass', message: domainCheck.message },
      policy: {
        status: 'fail',
        message: audit.reason,
        audit,
      },
      reachability: {
        status: 'skipped',
        message: 'Pemeriksaan HTTP HEAD dilewati karena URL/judul melanggar kebijakan konten.',
      },
      errorMessage: audit.reason,
      detectedKeywords: audit.detectedKeywords,
    };
  }

  if (options?.checkReachability === false) {
    return {
      isValid: true,
      normalizedUrl: domainCheck.normalizedUrl,
      hostname: domainCheck.hostname,
      domain: { status: 'pass', message: domainCheck.message },
      policy: {
        status: 'pass',
        message: 'Lolos audit kebijakan konten (bebas judi online & konten 18+).',
        audit,
      },
      reachability: {
        status: 'skipped',
        message: 'Klik "Validasi & Cek URL" atau simpan untuk memverifikasi HTTP 200 OK via HEAD.',
      },
      errorMessage: '',
      detectedKeywords: [],
    };
  }

  const headResult = await checkUrlHeadStatusViaApi(domainCheck.normalizedUrl, domainCheck.hostname);
  if (!headResult.ok200) {
    return {
      isValid: false,
      normalizedUrl: domainCheck.normalizedUrl,
      hostname: domainCheck.hostname,
      domain: { status: 'pass', message: domainCheck.message },
      policy: {
        status: 'pass',
        message: 'Lolos audit kebijakan konten (bebas judi online & konten 18+).',
        audit,
      },
      reachability: {
        status: 'fail',
        statusCode: headResult.statusCode,
        statusText: headResult.statusText,
        method: headResult.method,
        latencyMs: headResult.latencyMs,
        source: headResult.source,
        message: headResult.message,
      },
      errorMessage: headResult.message,
      detectedKeywords: [],
    };
  }

  return {
    isValid: true,
    normalizedUrl: domainCheck.normalizedUrl,
    hostname: domainCheck.hostname,
    domain: { status: 'pass', message: domainCheck.message },
    policy: {
      status: 'pass',
      message: 'Lolos audit kebijakan konten (bebas judi online & konten 18+).',
      audit,
    },
    reachability: {
      status: 'pass',
      statusCode: headResult.statusCode,
      statusText: headResult.statusText,
      method: headResult.method,
      latencyMs: headResult.latencyMs,
      source: headResult.source,
      message: headResult.message,
    },
    errorMessage: '',
    detectedKeywords: [],
  };
}
