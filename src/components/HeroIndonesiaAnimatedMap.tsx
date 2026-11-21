import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Globe } from 'lucide-react';
import { APP_NAME } from '../config/appConfig';
import { wpAuthService, NetworkMapStatsResponse } from '../services/wordpressAuthService';

/**
 * Direct local path to Boss's uploaded 38-province Indonesia hero SVG asset.
 */
const HERO_MAP_SVG_URL = '/assets/aistudio/Paste_November_22__2026_-_1_36AM_50eb5821';

/**
 * Curated dark-theme luminous palette for the 38 animated provincial capital dots.
 */
const CITY_PALETTE = [
  '#10b981', // Emerald
  '#22d3ee', // Cyan
  '#f59e0b', // Amber
  '#818cf8', // Indigo
  '#14b8a6', // Teal
  '#38bdf8', // Sky
] as const;

interface ProvinceMeta {
  provinceSvgId: string;
  citySvgId: string;
  name: string;
  capital: string;
  aliases: string[];
}

/**
 * Complete 38-province registry pairing every SVG province shape ID and capital dot ID.
 * Note: In the uploaded SVG export, `prov-papua-barat` covers eastern Papua (Jayapura)
 * while `prov-papua-barat-2` covers western Papua Barat (Manokwari).
 */
const PROVINCE_REGISTRY: ProvinceMeta[] = [
  { provinceSvgId: 'prov-aceh', citySvgId: 'city-banda-aceh', name: 'Aceh', capital: 'Banda Aceh', aliases: ['Aceh', 'Nanggroe Aceh Darussalam'] },
  { provinceSvgId: 'prov-sumatera-utara', citySvgId: 'city-medan', name: 'Sumatera Utara', capital: 'Medan', aliases: ['Sumatera Utara', 'Sumatra Utara'] },
  { provinceSvgId: 'prov-sumatera-barat', citySvgId: 'city-padang', name: 'Sumatera Barat', capital: 'Padang', aliases: ['Sumatera Barat', 'Sumatra Barat'] },
  { provinceSvgId: 'prov-riau', citySvgId: 'city-pekanbaru', name: 'Riau', capital: 'Pekanbaru', aliases: ['Riau'] },
  { provinceSvgId: 'prov-kepulauan-riau', citySvgId: 'city-tanjung-pinang', name: 'Kepulauan Riau', capital: 'Tanjung Pinang', aliases: ['Kepulauan Riau', 'Kep. Riau'] },
  { provinceSvgId: 'prov-jambi', citySvgId: 'city-jambi', name: 'Jambi', capital: 'Jambi', aliases: ['Jambi'] },
  { provinceSvgId: 'prov-bengkulu', citySvgId: 'city-bengkulu', name: 'Bengkulu', capital: 'Bengkulu', aliases: ['Bengkulu'] },
  { provinceSvgId: 'prov-sumatera-selatan', citySvgId: 'city-palembang', name: 'Sumatera Selatan', capital: 'Palembang', aliases: ['Sumatera Selatan', 'Sumatra Selatan'] },
  { provinceSvgId: 'prov-kepulauan-bangka-belitung', citySvgId: 'city-pangkal-pinang', name: 'Kepulauan Bangka Belitung', capital: 'Pangkal Pinang', aliases: ['Kepulauan Bangka Belitung', 'Bangka Belitung', 'Kep. Bangka Belitung'] },
  { provinceSvgId: 'prov-lampung', citySvgId: 'city-bandar-lampung', name: 'Lampung', capital: 'Bandar Lampung', aliases: ['Lampung'] },
  { provinceSvgId: 'prov-banten', citySvgId: 'city-serang', name: 'Banten', capital: 'Serang', aliases: ['Banten'] },
  { provinceSvgId: 'prov-dki-jakarta', citySvgId: 'city-jakarta', name: 'DKI Jakarta', capital: 'Jakarta', aliases: ['DKI Jakarta', 'Jakarta', 'Jakarta Raya'] },
  { provinceSvgId: 'prov-jawa-barat', citySvgId: 'city-bandung', name: 'Jawa Barat', capital: 'Bandung', aliases: ['Jawa Barat'] },
  { provinceSvgId: 'prov-jawa-tengah', citySvgId: 'city-semarang', name: 'Jawa Tengah', capital: 'Semarang', aliases: ['Jawa Tengah'] },
  { provinceSvgId: 'prov-daerah-istimewa-yogyakarta', citySvgId: 'city-yogyakarta', name: 'DI Yogyakarta', capital: 'Yogyakarta', aliases: ['Daerah Istimewa Yogyakarta', 'DI Yogyakarta', 'Yogyakarta'] },
  { provinceSvgId: 'prov-jawa-timur', citySvgId: 'city-surabaya', name: 'Jawa Timur', capital: 'Surabaya', aliases: ['Jawa Timur'] },
  { provinceSvgId: 'prov-bali', citySvgId: 'city-denpasar', name: 'Bali', capital: 'Denpasar', aliases: ['Bali'] },
  { provinceSvgId: 'prov-nusa-tenggara-barat', citySvgId: 'city-mataram', name: 'Nusa Tenggara Barat', capital: 'Mataram', aliases: ['Nusa Tenggara Barat', 'NTB'] },
  { provinceSvgId: 'prov-nusa-tenggara-timur', citySvgId: 'city-kupang', name: 'Nusa Tenggara Timur', capital: 'Kupang', aliases: ['Nusa Tenggara Timur', 'NTT'] },
  { provinceSvgId: 'prov-kalimantan-barat', citySvgId: 'city-pontianak', name: 'Kalimantan Barat', capital: 'Pontianak', aliases: ['Kalimantan Barat'] },
  { provinceSvgId: 'prov-kalimantan-tengah', citySvgId: 'city-palangka-raya', name: 'Kalimantan Tengah', capital: 'Palangka Raya', aliases: ['Kalimantan Tengah'] },
  { provinceSvgId: 'prov-kalimantan-selatan', citySvgId: 'city-banjarmasin', name: 'Kalimantan Selatan', capital: 'Banjarmasin', aliases: ['Kalimantan Selatan'] },
  { provinceSvgId: 'prov-kalimantan-timur', citySvgId: 'city-samarinda', name: 'Kalimantan Timur', capital: 'Samarinda', aliases: ['Kalimantan Timur'] },
  { provinceSvgId: 'prov-kalimantan-utara', citySvgId: 'city-tanjung-selor', name: 'Kalimantan Utara', capital: 'Tanjung Selor', aliases: ['Kalimantan Utara'] },
  { provinceSvgId: 'prov-sulawesi-utara', citySvgId: 'city-manado', name: 'Sulawesi Utara', capital: 'Manado', aliases: ['Sulawesi Utara'] },
  { provinceSvgId: 'prov-gorontalo', citySvgId: 'city-gorontalo', name: 'Gorontalo', capital: 'Gorontalo', aliases: ['Gorontalo'] },
  { provinceSvgId: 'prov-sulawesi-tengah', citySvgId: 'city-palu', name: 'Sulawesi Tengah', capital: 'Palu', aliases: ['Sulawesi Tengah'] },
  { provinceSvgId: 'prov-sulawesi-barat', citySvgId: 'city-mamuju', name: 'Sulawesi Barat', capital: 'Mamuju', aliases: ['Sulawesi Barat'] },
  { provinceSvgId: 'prov-sulawesi-selatan', citySvgId: 'city-makassar', name: 'Sulawesi Selatan', capital: 'Makassar', aliases: ['Sulawesi Selatan'] },
  { provinceSvgId: 'prov-sulawesi-tenggara', citySvgId: 'city-kendari', name: 'Sulawesi Tenggara', capital: 'Kendari', aliases: ['Sulawesi Tenggara'] },
  { provinceSvgId: 'prov-maluku-utara', citySvgId: 'city-ternate', name: 'Maluku Utara', capital: 'Ternate', aliases: ['Maluku Utara'] },
  { provinceSvgId: 'prov-maluku', citySvgId: 'city-ambon', name: 'Maluku', capital: 'Ambon', aliases: ['Maluku'] },
  { provinceSvgId: 'prov-papua-barat-daya', citySvgId: 'city-sorong', name: 'Papua Barat Daya', capital: 'Sorong', aliases: ['Papua Barat Daya'] },
  { provinceSvgId: 'prov-papua-barat-2', citySvgId: 'city-manokwari', name: 'Papua Barat', capital: 'Manokwari', aliases: ['Papua Barat'] },
  { provinceSvgId: 'prov-papua-tengah', citySvgId: 'city-nabire', name: 'Papua Tengah', capital: 'Nabire', aliases: ['Papua Tengah'] },
  { provinceSvgId: 'prov-papua-pegunungan', citySvgId: 'city-jayawijaya', name: 'Papua Pegunungan', capital: 'Wamena', aliases: ['Papua Pegunungan'] },
  { provinceSvgId: 'prov-papua-selatan', citySvgId: 'city-merauke', name: 'Papua Selatan', capital: 'Merauke', aliases: ['Papua Selatan'] },
  { provinceSvgId: 'prov-papua-barat', citySvgId: 'city-jayapura', name: 'Papua', capital: 'Jayapura', aliases: ['Papua'] },
];

const PROVINCE_BY_SVG_ID = new Map<string, ProvinceMeta>(
  PROVINCE_REGISTRY.map((p) => [p.provinceSvgId, p])
);

const PROVINCE_BY_CITY_ID = new Map<string, ProvinceMeta>(
  PROVINCE_REGISTRY.map((p) => [p.citySvgId, p])
);

interface ProvinceRandomSeed {
  baseMinOp: number;
  baseMaxOp: number;
  baseDur: number;
  delay: number;
  cityDur: number;
  ringDur: number;
  cityDelay: number;
  colorIndex: number;
}

interface HoveredProvinceState {
  meta: ProvinceMeta;
  color: string;
  x: number;
  y: number;
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('id-ID');
}

function normalizeProvinceKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getLiveProvinceMetrics(
  stats: NetworkMapStatsResponse | null,
  meta: ProvinceMeta
): { surfers: number; dailyHits: number; antiCheatScore: number } {
  if (!stats?.provinces) {
    return { surfers: 0, dailyHits: 0, antiCheatScore: stats?.antiCheatBase ?? 99.6 };
  }

  // Fast exact alias lookup first
  for (const alias of meta.aliases) {
    const exact = stats.provinces[alias];
    if (exact) return exact;
  }

  // Fallback normalized lookup
  const normalizedAliases = new Set(meta.aliases.map(normalizeProvinceKey));
  for (const [key, value] of Object.entries(stats.provinces)) {
    if (normalizedAliases.has(normalizeProvinceKey(key))) {
      return value;
    }
  }

  return { surfers: 0, dailyHits: 0, antiCheatScore: stats.antiCheatBase ?? 99.6 };
}

export const HeroIndonesiaAnimatedMap: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgHostRef = useRef<HTMLDivElement | null>(null);
  const cityColorIndexRef = useRef<Map<string, number>>(new Map());

  const [svgReady, setSvgReady] = useState(false);
  const [svgError, setSvgError] = useState(false);
  const [liveStats, setLiveStats] = useState<NetworkMapStatsResponse | null>(null);
  const [hovered, setHovered] = useState<HoveredProvinceState | null>(null);

  // Generate fresh randomized animation seeds once per mount so every visit feels organic
  const randomSeeds = useMemo<Map<string, ProvinceRandomSeed>>(() => {
    const map = new Map<string, ProvinceRandomSeed>();
    PROVINCE_REGISTRY.forEach((meta, idx) => {
      const baseMinOp = 0.12 + Math.random() * 0.12; // 0.12 - 0.24
      const baseMaxOp = 0.34 + Math.random() * 0.22; // 0.34 - 0.56
      const baseDur = 3.2 + Math.random() * 3.6; // 3.2s - 6.8s
      const delay = -(Math.random() * 6.5);
      const cityDur = 2.6 + Math.random() * 2.4;
      const ringDur = 2.8 + Math.random() * 2.8;
      const cityDelay = -(Math.random() * 5.0);
      const colorIndex = (idx + Math.floor(Math.random() * CITY_PALETTE.length)) % CITY_PALETTE.length;

      cityColorIndexRef.current.set(meta.citySvgId, colorIndex);
      map.set(meta.provinceSvgId, {
        baseMinOp,
        baseMaxOp,
        baseDur,
        delay,
        cityDur,
        ringDur,
        cityDelay,
        colorIndex,
      });
    });
    return map;
  }, []);

  // Poll public Trafik network stats (visibility-aware, 30s interval)
  useEffect(() => {
    let active = true;
    let timerId: number | null = null;

    const loadStats = async () => {
      try {
        const res = await wpAuthService.fetchNetworkMapStats(false);
        if (active && res) {
          setLiveStats(res);
        }
      } catch {
        // Silent graceful degradation: ambient animation continues smoothly
      }
    };

    loadStats();

    const startPolling = () => {
      if (timerId !== null) window.clearInterval(timerId);
      timerId = window.setInterval(() => {
        if (!document.hidden) {
          loadStats();
        }
      }, 30_000);
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        loadStats();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      if (timerId !== null) window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Apply live stats + random seeds to the 38 province shapes & 38 city nodes inside the mounted SVG
  const syncSvgTelemetry = useCallback(
    (stats: NetworkMapStatsResponse | null) => {
      const host = svgHostRef.current;
      if (!host) return;

      // Determine peak live activity across provinces to normalize visual intensity cleanly
      let maxActivity = 0;
      const activityByProvId = new Map<string, number>();

      PROVINCE_REGISTRY.forEach((meta) => {
        const m = getLiveProvinceMetrics(stats, meta);
        const score = m.surfers * 12 + m.dailyHits;
        activityByProvId.set(meta.provinceSvgId, score);
        if (score > maxActivity) maxActivity = score;
      });

      PROVINCE_REGISTRY.forEach((meta) => {
        const seed = randomSeeds.get(meta.provinceSvgId);
        if (!seed) return;

        const score = activityByProvId.get(meta.provinceSvgId) ?? 0;
        const intensity = maxActivity > 0 && score > 0 ? Math.min(1, Math.pow(score / maxActivity, 0.55)) : 0;

        // 1. Update province shape CSS custom properties (opacity range, fill tint, speed)
        const provEl = host.querySelector<SVGElement>(`#${CSS.escape(meta.provinceSvgId)}`);
        if (provEl) {
          const minOp = Math.min(0.62, seed.baseMinOp + intensity * 0.34);
          const maxOp = Math.min(0.92, seed.baseMaxOp + intensity * 0.36);
          const dur = Math.max(2.1, seed.baseDur - intensity * 1.6);

          // Blend ambient teal-slate tint toward luminous emerald for live active provinces
          const fillHex =
            intensity > 0.55
              ? '#34d399'
              : intensity > 0.15
                ? '#10b981'
                : seed.colorIndex % 2 === 0
                  ? '#0d9488'
                  : '#0284c7';

          const strokeColor =
            intensity > 0.25 ? 'rgba(167, 243, 208, 0.82)' : 'rgba(226, 232, 240, 0.52)';

          provEl.style.setProperty('--prov-min-op', minOp.toFixed(2));
          provEl.style.setProperty('--prov-max-op', maxOp.toFixed(2));
          provEl.style.setProperty('--prov-dur', `${dur.toFixed(2)}s`);
          provEl.style.setProperty('--prov-fill', fillHex);
          provEl.style.setProperty('--prov-stroke', strokeColor);
        }

        // 2. Update capital dot & concentric ripple speed/scale based on live traffic
        const cityEl = host.querySelector<SVGElement>(`#${CSS.escape(meta.citySvgId)}`);
        const ringEl = host.querySelector<SVGElement>(`[data-city-ring="${meta.citySvgId}"]`);
        const colorIdx = cityColorIndexRef.current.get(meta.citySvgId) ?? seed.colorIndex;
        const paletteColor = CITY_PALETTE[colorIdx % CITY_PALETTE.length];

        if (cityEl) {
          const cDur = Math.max(1.7, seed.cityDur - intensity * 0.9);
          cityEl.style.setProperty('--city-color', paletteColor);
          cityEl.style.setProperty('--city-dur', `${cDur.toFixed(2)}s`);
        }

        if (ringEl) {
          const rDur = Math.max(1.9, seed.ringDur - intensity * 1.0);
          const rScale = 2.6 + intensity * 1.8;
          ringEl.style.setProperty('--city-color', paletteColor);
          ringEl.style.setProperty('--ring-dur', `${rDur.toFixed(2)}s`);
          ringEl.style.setProperty('--ring-scale', rScale.toFixed(2));
        }
      });
    },
    [randomSeeds]
  );

  // Fetch & hydrate Boss's uploaded 38-province SVG directly from local asset path
  useEffect(() => {
    let cancelled = false;
    const host = svgHostRef.current;
    if (!host) return;

    const loadAndHydrateSvg = async () => {
      try {
        const response = await fetch(HERO_MAP_SVG_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const svgText = await response.text();
        if (cancelled) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl || doc.querySelector('parsererror')) {
          throw new Error('Invalid SVG document');
        }

        // Defense-in-depth strip any script elements
        svgEl.querySelectorAll('script').forEach((el) => el.remove());

        // Fit cleanly into hero visual box while keeping full 38-province aspect ratio
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgEl.setAttribute('role', 'img');
        svgEl.setAttribute(
          'aria-label',
          'Peta interaktif 38 provinsi Indonesia dengan animasi aktivitas jaringan Trafik secara real-time'
        );

        // Hide static Layer 3 backdrop so SVG blends seamlessly with dark slate hero card
        const layer3 = svgEl.querySelector('#Layer_3');
        if (layer3) {
          layer3.setAttribute('display', 'none');
        }

        // Subtly refine browser frame chrome (Layer 4) and device silhouettes (Layer 2) for dark-slate balance
        const layer4 = svgEl.querySelector<SVGElement>('#Layer_4');
        if (layer4) {
          layer4.style.opacity = '0.72';
          layer4.style.pointerEvents = 'none';
        }

        const layer2 = svgEl.querySelector<SVGElement>('#Layer_2');
        if (layer2) {
          layer2.style.opacity = '0.88';
          layer2.style.pointerEvents = 'none';
        }

        // Hydrate all 38 province shapes
        PROVINCE_REGISTRY.forEach((meta) => {
          const seed = randomSeeds.get(meta.provinceSvgId);
          const provEl = svgEl.querySelector<SVGElement>(`#${CSS.escape(meta.provinceSvgId)}`);
          if (provEl && seed) {
            provEl.classList.add('trafik-hero-province');
            provEl.setAttribute('data-province-svg-id', meta.provinceSvgId);
            provEl.removeAttribute('fill');
            provEl.removeAttribute('stroke');
            provEl.style.setProperty('--prov-delay', `${seed.delay.toFixed(2)}s`);
          }
        });

        // Hydrate all 38 provincial capital dots + inject concentric animated radar ripple rings
        const cityLayer = svgEl.querySelector('#Trafik___City');
        const SVG_NS = 'http://www.w3.org/2000/svg';

        PROVINCE_REGISTRY.forEach((meta) => {
          const seed = randomSeeds.get(meta.provinceSvgId);
          const cityEl = svgEl.querySelector<SVGCircleElement>(`#${CSS.escape(meta.citySvgId)}`);
          if (cityEl && seed) {
            const cx = cityEl.getAttribute('cx') || '0';
            const cy = cityEl.getAttribute('cy') || '0';
            const initialColor = CITY_PALETTE[seed.colorIndex];

            // Scale dot slightly so all 38 capitals read clearly in the hero viewport
            cityEl.setAttribute('r', '9.5');
            cityEl.removeAttribute('fill');
            cityEl.removeAttribute('stroke');
            cityEl.classList.add('trafik-hero-city-dot');
            cityEl.setAttribute('data-city-svg-id', meta.citySvgId);
            cityEl.style.setProperty('--city-color', initialColor);
            cityEl.style.setProperty('--city-delay', `${seed.cityDelay.toFixed(2)}s`);

            // Insert matching radar pulse ring right behind the city dot
            if (cityLayer) {
              const ring = doc.createElementNS(SVG_NS, 'circle');
              ring.setAttribute('cx', cx);
              ring.setAttribute('cy', cy);
              ring.setAttribute('r', '9.5');
              ring.setAttribute('class', 'trafik-hero-city-ring');
              ring.setAttribute('data-city-ring', meta.citySvgId);
              ring.style.setProperty('--city-color', initialColor);
              ring.style.setProperty('--city-delay', `${seed.cityDelay.toFixed(2)}s`);
              cityLayer.insertBefore(ring, cityEl);
            }
          }
        });

        host.innerHTML = '';
        host.appendChild(document.importNode(svgEl, true));
        setSvgReady(true);
      } catch {
        if (!cancelled) {
          setSvgError(true);
        }
      }
    };

    loadAndHydrateSvg();

    return () => {
      cancelled = true;
    };
  }, [randomSeeds]);

  // Re-sync SVG CSS variables whenever SVG finishes loading or fresh live stats arrive
  useEffect(() => {
    if (!svgReady) return;
    syncSvgTelemetry(liveStats);
  }, [svgReady, liveStats, syncSvgTelemetry]);

  // Gently rotate random capital city dot palette colors every 4.2s for vibrant living motion
  useEffect(() => {
    if (!svgReady) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const host = svgHostRef.current;
      if (!host) return;

      // Pick 6 random capitals per tick and transition their palette color smoothly
      const count = 6;
      for (let i = 0; i < count; i++) {
        const meta = PROVINCE_REGISTRY[Math.floor(Math.random() * PROVINCE_REGISTRY.length)];
        const prevIdx = cityColorIndexRef.current.get(meta.citySvgId) ?? 0;
        let nextIdx = Math.floor(Math.random() * CITY_PALETTE.length);
        if (nextIdx === prevIdx) nextIdx = (prevIdx + 1) % CITY_PALETTE.length;

        cityColorIndexRef.current.set(meta.citySvgId, nextIdx);
        const nextColor = CITY_PALETTE[nextIdx];

        const cityEl = host.querySelector<SVGElement>(`#${CSS.escape(meta.citySvgId)}`);
        const ringEl = host.querySelector<SVGElement>(`[data-city-ring="${meta.citySvgId}"]`);
        if (cityEl) cityEl.style.setProperty('--city-color', nextColor);
        if (ringEl) ringEl.style.setProperty('--city-color', nextColor);
      }
    }, 4200);

    return () => window.clearInterval(timer);
  }, [svgReady]);

  // Delegated pointer hover detection across all 38 provinces & 38 capital dots
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as Element | null;
    const container = containerRef.current;
    if (!target || !container) return;

    const provSvgId = target.getAttribute('data-province-svg-id');
    const citySvgId = target.getAttribute('data-city-svg-id');

    const meta = provSvgId
      ? PROVINCE_BY_SVG_ID.get(provSvgId)
      : citySvgId
        ? PROVINCE_BY_CITY_ID.get(citySvgId)
        : undefined;

    if (!meta) {
      setHovered((prev) => (prev ? null : prev));
      return;
    }

    const rect = container.getBoundingClientRect();
    const colorIdx = cityColorIndexRef.current.get(meta.citySvgId) ?? 0;
    const color = CITY_PALETTE[colorIdx % CITY_PALETTE.length];

    setHovered({
      meta,
      color,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHovered(null);
  }, []);

  // Synchronize hovered highlight across paired province shape & capital dot
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || !svgReady) return;

    host.querySelectorAll('[data-hovered="true"]').forEach((el) => {
      el.removeAttribute('data-hovered');
    });

    if (hovered) {
      const provEl = host.querySelector(`#${CSS.escape(hovered.meta.provinceSvgId)}`);
      const cityEl = host.querySelector(`#${CSS.escape(hovered.meta.citySvgId)}`);
      if (provEl) provEl.setAttribute('data-hovered', 'true');
      if (cityEl) cityEl.setAttribute('data-hovered', 'true');
    }
  }, [hovered, svgReady]);

  const hoveredMetrics = useMemo(() => {
    if (!hovered) return null;
    return getLiveProvinceMetrics(liveStats, hovered.meta);
  }, [hovered, liveStats]);

  // Compute safe tooltip coordinates clamped inside the hero container
  const tooltipStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!hovered || !containerRef.current) return undefined;
    const width = containerRef.current.clientWidth || 500;
    const tooltipW = 220;
    const placeLeft = hovered.x + tooltipW + 20 > width;
    const left = placeLeft ? Math.max(12, hovered.x - tooltipW - 14) : hovered.x + 14;
    const top = Math.max(12, hovered.y - 78);
    return { left, top };
  }, [hovered]);

  const activeProvinceCount = useMemo(() => {
    if (!liveStats?.provinces) return 0;
    return Object.values(liveStats.provinces).filter((p) => p.surfers > 0 || p.dailyHits > 0).length;
  }, [liveStats]);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative h-full min-h-[300px] sm:min-h-[370px] flex flex-col justify-between overflow-hidden border border-slate-800 bg-[#0f172a]"
    >
      {/* Subtle architectural radial ambience behind the 38-province archipelago */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(16,185,129,0.12),rgba(15,23,42,0)_68%)]"
      />

      {/* Top micro header strip */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-3.5 pb-1 text-[11px] text-slate-400">
        <span className="font-mono uppercase tracking-[0.14em] text-slate-300">
          Jaringan 38 Provinsi · Indonesia
        </span>
        <span className="font-mono tabular-nums text-emerald-400">
          {liveStats
            ? `${activeProvinceCount > 0 ? activeProvinceCount : 38} Node Aktif`
            : 'Live Data'}
        </span>
      </div>

      {/* Inline Animated 38-Province SVG Canvas */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-2 sm:px-3 py-1">
        {!svgError ? (
          <div
            ref={svgHostRef}
            className={`trafik-hero-svg-stage w-full aspect-[2880/1584] transition-opacity duration-500 ${
              svgReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center">
            <Globe className="w-11 h-11 text-emerald-400 mb-3" />
            <div className="text-sm font-semibold text-slate-200">{APP_NAME} Nusantara</div>
            <div className="text-xs text-slate-400 mt-1">
              Distribusi Pengunjung Lokal 38 Provinsi
            </div>
          </div>
        )}
      </div>

      {/* Interactive Province & Capital Tooltip */}
      {hovered && hoveredMetrics && tooltipStyle && (
        <div
          style={tooltipStyle}
          className="pointer-events-none absolute z-30 w-[220px] border border-slate-700/90 bg-slate-950/95 backdrop-blur-sm px-3 py-2.5 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 shrink-0 rounded-full"
              style={{ backgroundColor: hovered.color }}
            />
            <span className="text-xs font-semibold text-white truncate">{hovered.meta.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 pl-4">
            Ibu Kota: <span className="text-slate-200">{hovered.meta.capital}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Surfer</div>
              <div className="text-xs font-mono tabular-nums font-semibold text-emerald-400">
                {formatCompactNumber(hoveredMetrics.surfers)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Hits 24J</div>
              <div className="text-xs font-mono tabular-nums font-semibold text-cyan-300">
                {formatCompactNumber(hoveredMetrics.dailyHits)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Live Trafik Network Stats Footer Bar */}
      <div className="relative z-10 border-t border-slate-800/90 bg-slate-950/70 backdrop-blur-xs grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-slate-800/80">
        <div className="px-3.5 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Surfer Aktif</div>
          <div className="text-sm font-mono tabular-nums font-semibold text-emerald-400 mt-0.5">
            {liveStats ? formatCompactNumber(liveStats.totalSurfers) : '—'}
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Hits 24 Jam</div>
          <div className="text-sm font-mono tabular-nums font-semibold text-cyan-300 mt-0.5">
            {liveStats ? formatCompactNumber(liveStats.totalHits24h) : '—'}
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Kampanye</div>
          <div className="text-sm font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
            {liveStats ? formatCompactNumber(liveStats.activeCampaigns) : '—'}
          </div>
        </div>
        <div className="px-3.5 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Member</div>
          <div className="text-sm font-mono tabular-nums font-semibold text-amber-300 mt-0.5">
            {liveStats ? formatCompactNumber(liveStats.registeredUsers) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
