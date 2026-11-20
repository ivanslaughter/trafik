export interface BrandLogoConfig {
  logoDataUrl: string | null;
  logoType: 'svg' | 'png' | 'webp' | null;
  fileName?: string;
  heightPx: number;
  showBrandText: boolean;
  invertForDark: boolean;
  updatedAt?: string;
}

export const DEFAULT_BRAND_LOGO: BrandLogoConfig = {
  logoDataUrl: null,
  logoType: null,
  fileName: '',
  heightPx: 32,
  showBrandText: true,
  invertForDark: false,
};

const STORAGE_KEY = 'tn_brand_logo_config_v1';
const MAX_LOGO_BYTES = 350 * 1024; // 350 KB limit for fast 4G loading

export function loadStoredBrandLogo(): BrandLogoConfig {
  if (typeof localStorage === 'undefined') return DEFAULT_BRAND_LOGO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_LOGO;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_BRAND_LOGO;
    return {
      ...DEFAULT_BRAND_LOGO,
      ...parsed,
      heightPx: Math.min(48, Math.max(20, Number(parsed.heightPx) || 32)),
      showBrandText: parsed.showBrandText !== false,
      invertForDark: Boolean(parsed.invertForDark),
    };
  } catch {
    return DEFAULT_BRAND_LOGO;
  }
}

export function saveStoredBrandLogo(config: BrandLogoConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
}

/**
 * Strictly sanitizes raw SVG XML markup to prevent XSS / script injection,
 * ensures proper xmlns & viewBox for crisp responsive scaling,
 * and returns a clean SVG string.
 */
export function sanitizeSvgMarkup(rawSvg: string): { ok: boolean; svg?: string; error?: string } {
  const trimmed = rawSvg
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trim();

  if (!trimmed || !/<svg[\s>]/i.test(trimmed)) {
    return { ok: false, error: 'File tidak berisi elemen <svg> yang valid.' };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  const svgEl = doc.querySelector('svg');

  if (parseError || !svgEl) {
    return {
      ok: false,
      error: 'Struktur XML SVG tidak valid. Pastikan file SVG tidak rusak.',
    };
  }

  // Strip dangerous tags completely
  const forbiddenTags = ['script', 'foreignObject', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'audio', 'video'];
  for (const tag of forbiddenTags) {
    svgEl.querySelectorAll(tag).forEach((el) => el.remove());
  }

  // Strip unsafe attributes (inline event handlers, javascript: URIs, external stylesheet imports)
  const allElements = [svgEl, ...Array.from(svgEl.querySelectorAll('*'))];
  for (const el of allElements) {
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (name === 'href' || name === 'xlink:href' || name === 'src') {
        const lowerVal = val.replace(/\s+/g, '').toLowerCase();
        if (
          lowerVal.startsWith('javascript:') ||
          lowerVal.startsWith('vbscript:') ||
          lowerVal.startsWith('data:text/html') ||
          lowerVal.startsWith('http://') ||
          lowerVal.startsWith('https://')
        ) {
          el.removeAttribute(attr.name);
        }
      }

      if (name === 'style' && /expression\s*\(|javascript:|url\s*\(\s*['"]?\s*https?:/i.test(val)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  // Ensure XML namespace so it renders cleanly inside <img src="data:image/svg+xml;base64,...">
  if (!svgEl.getAttribute('xmlns')) {
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  // Synthesize viewBox if missing but numeric width/height exist
  if (!svgEl.getAttribute('viewBox')) {
    const wRaw = svgEl.getAttribute('width') || '';
    const hRaw = svgEl.getAttribute('height') || '';
    const w = parseFloat(wRaw);
    const h = parseFloat(hRaw);
    if (w > 0 && h > 0) {
      svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }
  }

  const serializer = new XMLSerializer();
  const cleanSvg = serializer.serializeToString(svgEl).trim();

  if (cleanSvg.length > MAX_LOGO_BYTES) {
    return {
      ok: false,
      error: 'Ukuran file SVG terlalu besar (maksimal 350 KB). Optimalkan vektor terlebih dahulu.',
    };
  }

  return { ok: true, svg: cleanSvg };
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function processRawSvgCode(
  rawSvg: string,
  fileName = 'logo-custom.svg'
): { ok: boolean; dataUrl?: string; logoType?: 'svg'; fileName?: string; error?: string } {
  const sanitized = sanitizeSvgMarkup(rawSvg);
  if (!sanitized.ok || !sanitized.svg) {
    return { ok: false, error: sanitized.error || 'SVG tidak valid.' };
  }
  const base64 = utf8ToBase64(sanitized.svg);
  return {
    ok: true,
    dataUrl: `data:image/svg+xml;base64,${base64}`,
    logoType: 'svg',
    fileName,
  };
}

export async function processLogoFile(
  file: File
): Promise<{
  ok: boolean;
  dataUrl?: string;
  logoType?: 'svg' | 'png' | 'webp';
  fileName?: string;
  error?: string;
}> {
  if (!file) {
    return { ok: false, error: 'Tidak ada file yang dipilih.' };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return {
      ok: false,
      error: `Ukuran file (${Math.round(file.size / 1024)} KB) melebihi batas 350 KB agar portal tetap cepat di jaringan 4G.`,
    };
  }

  const lowerName = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();

  const isSvg = mime === 'image/svg+xml' || lowerName.endsWith('.svg');
  const isPng = mime === 'image/png' || lowerName.endsWith('.png');
  const isWebp = mime === 'image/webp' || lowerName.endsWith('.webp');

  if (!isSvg && !isPng && !isWebp) {
    return {
      ok: false,
      error: 'Format file tidak didukung. Gunakan file .SVG, .PNG, atau .WEBP.',
    };
  }

  if (isSvg) {
    const text = await file.text();
    return processRawSvgCode(text, file.name);
  }

  // PNG or WebP -> Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:image/')) {
        resolve({ ok: false, error: 'Gagal membaca file gambar.' });
        return;
      }
      resolve({
        ok: true,
        dataUrl: result,
        logoType: isWebp ? 'webp' : 'png',
        fileName: file.name,
      });
    };
    reader.onerror = () => resolve({ ok: false, error: 'Gagal membaca file dari perangkat.' });
    reader.readAsDataURL(file);
  });
}

let originalFaviconHref: string | null = null;

export function applyBrandFavicon(logoDataUrl: string | null): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  if (originalFaviconHref === null && link) {
    originalFaviconHref = link.getAttribute('href') || '';
  }

  if (!logoDataUrl) {
    if (link && originalFaviconHref) {
      link.href = originalFaviconHref;
    }
    return;
  }

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.type = logoDataUrl.startsWith('data:image/svg+xml')
    ? 'image/svg+xml'
    : logoDataUrl.startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/png';
  link.href = logoDataUrl;
}
