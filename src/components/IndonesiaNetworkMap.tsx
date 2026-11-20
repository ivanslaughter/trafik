import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Globe,
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Zap,
  Activity,
  ShieldCheck,
  Search,
  TrendingUp,
  Users,
  Eye,
  BarChart3,
  Layers
} from 'lucide-react';
import { IndonesianRegionId } from '../types';
import { INDONESIAN_REGIONS } from '../data/mockData';

interface IndonesiaNetworkMapProps {
  onSelectRegion?: (regionId: IndonesianRegionId) => void;
  selectedRegion?: IndonesianRegionId;
}

export interface ProvinceTrafficStats {
  name: string;
  regionId: IndonesianRegionId;
  surfers: number;
  dailyHits: number;
  antiCheatScore: number; // percentage (e.g. 99.8)
  topCities: string[];
}

// Comprehensive real-time traffic distribution stats for all 34 Indonesian Provinces
export const PROVINCE_TRAFFIC_DATA: Record<string, ProvinceTrafficStats> = {
  'DKI Jakarta': {
    name: 'DKI Jakarta',
    regionId: 'jabodetabek',
    surfers: 520,
    dailyHits: 14500,
    antiCheatScore: 99.9,
    topCities: ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Utara'],
  },
  'Jawa Barat': {
    name: 'Jawa Barat',
    regionId: 'jawa_barat',
    surfers: 240,
    dailyHits: 8900,
    antiCheatScore: 99.8,
    topCities: ['Bandung', 'Bekasi', 'Depok', 'Bogor', 'Cirebon', 'Cimahi'],
  },
  'Jawa Timur': {
    name: 'Jawa Timur',
    regionId: 'jawa_timur',
    surfers: 210,
    dailyHits: 7850,
    antiCheatScore: 99.7,
    topCities: ['Surabaya', 'Malang', 'Sidoarjo', 'Kediri', 'Madiun', 'Jember'],
  },
  'Jawa Tengah': {
    name: 'Jawa Tengah',
    regionId: 'jawa_tengah',
    surfers: 185,
    dailyHits: 6900,
    antiCheatScore: 99.8,
    topCities: ['Semarang', 'Surakarta (Solo)', 'Magelang', 'Tegal', 'Pekalongan'],
  },
  'Sumatera Utara': {
    name: 'Sumatera Utara',
    regionId: 'sumatera',
    surfers: 130,
    dailyHits: 4800,
    antiCheatScore: 99.6,
    topCities: ['Medan', 'Binjai', 'Pematangsiantar', 'Deli Serdang'],
  },
  'Banten': {
    name: 'Banten',
    regionId: 'jawa_barat',
    surfers: 110,
    dailyHits: 3950,
    antiCheatScore: 99.7,
    topCities: ['Tangerang', 'Tangerang Selatan', 'Serang', 'Cilegon'],
  },
  'Bali': {
    name: 'Bali',
    regionId: 'bali_nusra',
    surfers: 75,
    dailyHits: 2850,
    antiCheatScore: 99.9,
    topCities: ['Denpasar', 'Badung', 'Gianyar', 'Buleleng'],
  },
  'Daerah Istimewa Yogyakarta': {
    name: 'DI Yogyakarta',
    regionId: 'jawa_tengah',
    surfers: 68,
    dailyHits: 2450,
    antiCheatScore: 99.9,
    topCities: ['Yogyakarta', 'Sleman', 'Bantul', 'Gunungkidul'],
  },
  'Sumatera Selatan': {
    name: 'Sumatera Selatan',
    regionId: 'sumatera',
    surfers: 55,
    dailyHits: 1950,
    antiCheatScore: 99.5,
    topCities: ['Palembang', 'Prabumulih', 'Lubuklinggau'],
  },
  'Riau': {
    name: 'Riau',
    regionId: 'sumatera',
    surfers: 48,
    dailyHits: 1750,
    antiCheatScore: 99.6,
    topCities: ['Pekanbaru', 'Dumai', 'Kampar'],
  },
  'Kalimantan Timur': {
    name: 'Kalimantan Timur',
    regionId: 'kalimantan',
    surfers: 42,
    dailyHits: 1580,
    antiCheatScore: 99.8,
    topCities: ['Balikpapan', 'Samarinda', 'Bontang', 'Kutai Kartanegara'],
  },
  'Sulawesi Selatan': {
    name: 'Sulawesi Selatan',
    regionId: 'sulawesi',
    surfers: 38,
    dailyHits: 1420,
    antiCheatScore: 99.5,
    topCities: ['Makassar', 'Gowa', 'Maros', 'Palopo'],
  },
  'Lampung': {
    name: 'Lampung',
    regionId: 'sumatera',
    surfers: 35,
    dailyHits: 1250,
    antiCheatScore: 99.4,
    topCities: ['Bandar Lampung', 'Metro', 'Lampung Selatan'],
  },
  'Kalimantan Barat': {
    name: 'Kalimantan Barat',
    regionId: 'kalimantan',
    surfers: 28,
    dailyHits: 980,
    antiCheatScore: 99.6,
    topCities: ['Pontianak', 'Singkawang', 'Kubu Raya'],
  },
  'Sumatera Barat': {
    name: 'Sumatera Barat',
    regionId: 'sumatera',
    surfers: 25,
    dailyHits: 890,
    antiCheatScore: 99.7,
    topCities: ['Padang', 'Bukittinggi', 'Payakumbuh'],
  },
  'Nusa Tenggara Barat': {
    name: 'Nusa Tenggara Barat',
    regionId: 'bali_nusra',
    surfers: 22,
    dailyHits: 820,
    antiCheatScore: 99.5,
    topCities: ['Mataram', 'Bima', 'Lombok Barat'],
  },
  'Kalimantan Selatan': {
    name: 'Kalimantan Selatan',
    regionId: 'kalimantan',
    surfers: 20,
    dailyHits: 750,
    antiCheatScore: 99.4,
    topCities: ['Banjarmasin', 'Banjarbaru', 'Martapura'],
  },
  'Aceh': {
    name: 'Aceh',
    regionId: 'sumatera',
    surfers: 18,
    dailyHits: 680,
    antiCheatScore: 99.5,
    topCities: ['Banda Aceh', 'Lhokseumawe', 'Langsa'],
  },
  'Jambi': {
    name: 'Jambi',
    regionId: 'sumatera',
    surfers: 16,
    dailyHits: 590,
    antiCheatScore: 99.4,
    topCities: ['Jambi', 'Sungai Penuh', 'Muaro Jambi'],
  },
  'Nusa Tenggara Timur': {
    name: 'Nusa Tenggara Timur',
    regionId: 'bali_nusra',
    surfers: 15,
    dailyHits: 520,
    antiCheatScore: 99.6,
    topCities: ['Kupang', 'Labuan Bajo (Manggarai Barat)', 'Ende'],
  },
  'Sulawesi Utara': {
    name: 'Sulawesi Utara',
    regionId: 'sulawesi',
    surfers: 14,
    dailyHits: 490,
    antiCheatScore: 99.7,
    topCities: ['Manado', 'Bitung', 'Tomohon'],
  },
  'Kalimantan Tengah': {
    name: 'Kalimantan Tengah',
    regionId: 'kalimantan',
    surfers: 13,
    dailyHits: 450,
    antiCheatScore: 99.5,
    topCities: ['Palangkaraya', 'Kotawaringin Barat', 'Sampit'],
  },
  'Kepulauan Riau': {
    name: 'Kepulauan Riau',
    regionId: 'sumatera',
    surfers: 12,
    dailyHits: 430,
    antiCheatScore: 99.8,
    topCities: ['Batam', 'Tanjungpinang', 'Bintan', 'Karimun'],
  },
  'Bengkulu': {
    name: 'Bengkulu',
    regionId: 'sumatera',
    surfers: 10,
    dailyHits: 360,
    antiCheatScore: 99.3,
    topCities: ['Bengkulu', 'Rejang Lebong', 'Mukomuko'],
  },
  'Kepulauan Bangka Belitung': {
    name: 'Kepulauan Bangka Belitung',
    regionId: 'sumatera',
    surfers: 9,
    dailyHits: 320,
    antiCheatScore: 99.6,
    topCities: ['Pangkalpinang', 'Tanjung Pandan', 'Sungailiat'],
  },
  'Sulawesi Tengah': {
    name: 'Sulawesi Tengah',
    regionId: 'sulawesi',
    surfers: 9,
    dailyHits: 310,
    antiCheatScore: 99.5,
    topCities: ['Palu', 'Luwuk', 'Poso'],
  },
  'Kalimantan Utara': {
    name: 'Kalimantan Utara',
    regionId: 'kalimantan',
    surfers: 8,
    dailyHits: 290,
    antiCheatScore: 99.7,
    topCities: ['Tarakan', 'Tanjung Selor', 'Nunukan'],
  },
  'Sulawesi Tenggara': {
    name: 'Sulawesi Tenggara',
    regionId: 'sulawesi',
    surfers: 8,
    dailyHits: 270,
    antiCheatScore: 99.4,
    topCities: ['Kendari', 'Baubau', 'Kolaka'],
  },
  'Maluku': {
    name: 'Maluku',
    regionId: 'sulawesi',
    surfers: 7,
    dailyHits: 240,
    antiCheatScore: 99.5,
    topCities: ['Ambon', 'Tual', 'Banda'],
  },
  'Maluku Utara': {
    name: 'Maluku Utara',
    regionId: 'sulawesi',
    surfers: 5,
    dailyHits: 180,
    antiCheatScore: 99.3,
    topCities: ['Ternate', 'Tidore', 'Halmahera'],
  },
  'Gorontalo': {
    name: 'Gorontalo',
    regionId: 'sulawesi',
    surfers: 5,
    dailyHits: 160,
    antiCheatScore: 99.6,
    topCities: ['Gorontalo', 'Limboto', 'Bone Bolango'],
  },
  'Sulawesi Barat': {
    name: 'Sulawesi Barat',
    regionId: 'sulawesi',
    surfers: 4,
    dailyHits: 140,
    antiCheatScore: 99.4,
    topCities: ['Mamuju', 'Polewali Mandar', 'Majene'],
  },
  // 6 Provinsi di Wilayah Papua (Lengkap 38 Provinsi Nusantara)
  'Papua': {
    name: 'Papua',
    regionId: 'sulawesi',
    surfers: 12,
    dailyHits: 410,
    antiCheatScore: 99.4,
    topCities: ['Kota Jayapura', 'Jayapura', 'Biak Numfor', 'Kepulauan Yapen', 'Sarmi', 'Keerom'],
  },
  'Papua Barat': {
    name: 'Papua Barat',
    regionId: 'sulawesi',
    surfers: 6,
    dailyHits: 220,
    antiCheatScore: 99.5,
    topCities: ['Manokwari', 'Fakfak', 'Kaimana', 'Teluk Bintuni', 'Teluk Wondama'],
  },
  'Papua Barat Daya': {
    name: 'Papua Barat Daya',
    regionId: 'sulawesi',
    surfers: 8,
    dailyHits: 280,
    antiCheatScore: 99.7,
    topCities: ['Kota Sorong', 'Raja Ampat', 'Sorong', 'Sorong Selatan', 'Tambrauw', 'Maybrat'],
  },
  'Papua Tengah': {
    name: 'Papua Tengah',
    regionId: 'sulawesi',
    surfers: 9,
    dailyHits: 310,
    antiCheatScore: 99.6,
    topCities: ['Nabire', 'Timika (Mimika)', 'Paniai', 'Puncak Jaya', 'Intan Jaya', 'Deiyai'],
  },
  'Papua Pegunungan': {
    name: 'Papua Pegunungan',
    regionId: 'sulawesi',
    surfers: 6,
    dailyHits: 210,
    antiCheatScore: 99.5,
    topCities: ['Wamena (Jayawijaya)', 'Tolikara', 'Lanny Jaya', 'Pegunungan Bintang', 'Yahukimo', 'Yalimo'],
  },
  'Papua Selatan': {
    name: 'Papua Selatan',
    regionId: 'sulawesi',
    surfers: 7,
    dailyHits: 240,
    antiCheatScore: 99.6,
    topCities: ['Merauke', 'Boven Digoel', 'Mappi', 'Asmat'],
  },
};

// Strategic Radar Nodes across Indonesia (SVG coordinates on 1630.898 x 600)
interface RadarNode {
  name: string;
  province: string;
  x: number;
  y: number;
  surfers: number;
}

// Bounding Center & Zoom scale for each Indonesian region on 1630.898 x 600 viewBox
export const REGION_BOUNDS: Record<IndonesianRegionId, { x: number; y: number; k: number }> = {
  nasional: { x: 815.45, y: 300, k: 1 },
  jabodetabek: { x: 420, y: 430, k: 4.8 },
  jawa_barat: { x: 450, y: 455, k: 3.6 },
  jawa_tengah: { x: 535, y: 460, k: 3.6 },
  jawa_timur: { x: 630, y: 470, k: 3.6 },
  sumatera: { x: 210, y: 220, k: 1.8 },
  bali_nusra: { x: 790, y: 520, k: 3.2 },
  kalimantan: { x: 640, y: 260, k: 2.2 },
  sulawesi: { x: 1250, y: 320, k: 1.5 },
};

// Explicit readable labels for Regional Filter buttons
export const REGION_SHORT_LABELS: Record<IndonesianRegionId, string> = {
  nasional: 'Semua Nusantara (38 Prov)',
  jabodetabek: 'Jabodetabek',
  jawa_barat: 'Jawa Barat',
  jawa_tengah: 'Jawa Tengah & DIY',
  jawa_timur: 'Jawa Timur',
  sumatera: 'Sumatera',
  bali_nusra: 'Bali & Nusa Tenggara',
  kalimantan: 'Kalimantan',
  sulawesi: 'Sulawesi & Papua',
};

// Province coordinates for direct zoom when clicked on leaderboard or map
export const PROVINCE_COORDINATES: Record<string, { x: number; y: number; k: number }> = {
  'DKI Jakarta': { x: 420, y: 428, k: 5.5 },
  'Jawa Barat': { x: 447, y: 453, k: 3.8 },
  'Jawa Timur': { x: 631, y: 470, k: 3.8 },
  'Jawa Tengah': { x: 547, y: 455, k: 3.8 },
  'Sumatera Utara': { x: 130, y: 76, k: 3.2 },
  'Banten': { x: 390, y: 430, k: 4.5 },
  'Bali': { x: 717, y: 515, k: 5.0 },
  'Daerah Istimewa Yogyakarta': { x: 525, y: 475, k: 5.5 },
  'Sumatera Selatan': { x: 260, y: 250, k: 3.0 },
  'Riau': { x: 200, y: 190, k: 3.0 },
  'Kalimantan Timur': { x: 773, y: 247, k: 3.0 },
  'Sulawesi Selatan': { x: 868, y: 393, k: 3.2 },
  'Lampung': { x: 340, y: 390, k: 3.5 },
  'Kalimantan Barat': { x: 505, y: 275, k: 2.8 },
  'Sumatera Barat': { x: 170, y: 220, k: 3.2 },
  'Nusa Tenggara Barat': { x: 780, y: 525, k: 3.8 },
  'Kalimantan Selatan': { x: 660, y: 370, k: 3.2 },
  'Aceh': { x: 60, y: 60, k: 3.2 },
  'Jambi': { x: 230, y: 260, k: 3.2 },
  'Nusa Tenggara Timur': { x: 920, y: 540, k: 3.0 },
  'Sulawesi Utara': { x: 1020, y: 140, k: 3.5 },
  'Kalimantan Tengah': { x: 590, y: 300, k: 2.8 },
  'Kepulauan Riau': { x: 300, y: 160, k: 3.8 },
  'Bengkulu': { x: 230, y: 330, k: 3.5 },
  'Kepulauan Bangka Belitung': { x: 350, y: 290, k: 3.5 },
  'Sulawesi Tengah': { x: 900, y: 270, k: 3.0 },
  'Kalimantan Utara': { x: 730, y: 150, k: 3.2 },
  'Sulawesi Tenggara': { x: 950, y: 400, k: 3.2 },
  'Maluku': { x: 1179, y: 338, k: 3.0 },
  'Maluku Utara': { x: 1140, y: 190, k: 3.2 },
  'Gorontalo': { x: 950, y: 190, k: 3.8 },
  'Sulawesi Barat': { x: 840, y: 320, k: 3.5 },
  'Papua': { x: 1598, y: 291, k: 3.0 },
  'Papua Barat': { x: 1363, y: 235, k: 3.2 },
  'Papua Barat Daya': { x: 1289, y: 237, k: 3.5 },
  'Papua Tengah': { x: 1511, y: 357, k: 3.0 },
  'Papua Pegunungan': { x: 1558, y: 348, k: 3.2 },
  'Papua Selatan': { x: 1558, y: 506, k: 3.0 },
};

const STRATEGIC_RADAR_NODES: RadarNode[] = [
  { name: 'Medan', province: 'Sumatera Utara', x: 130, y: 76, surfers: 85 },
  { name: 'Palembang', province: 'Sumatera Selatan', x: 260, y: 250, surfers: 45 },
  { name: 'Jakarta (IDC)', province: 'DKI Jakarta', x: 420, y: 428, surfers: 520 },
  { name: 'Bandung', province: 'Jawa Barat', x: 447, y: 453, surfers: 240 },
  { name: 'Semarang', province: 'Jawa Tengah', x: 547, y: 455, surfers: 185 },
  { name: 'Surabaya', province: 'Jawa Timur', x: 631, y: 470, surfers: 210 },
  { name: 'Denpasar', province: 'Bali', x: 717, y: 515, surfers: 75 },
  { name: 'Pontianak', province: 'Kalimantan Barat', x: 515, y: 265, surfers: 28 },
  { name: 'Balikpapan', province: 'Kalimantan Timur', x: 773, y: 247, surfers: 42 },
  { name: 'Makassar', province: 'Sulawesi Selatan', x: 868, y: 393, surfers: 38 },
  { name: 'Manado', province: 'Sulawesi Utara', x: 1020, y: 140, surfers: 14 },
  { name: 'Ambon', province: 'Maluku', x: 1179, y: 338, surfers: 7 },
  { name: 'Sorong', province: 'Papua Barat Daya', x: 1289, y: 237, surfers: 8 },
  { name: 'Manokwari', province: 'Papua Barat', x: 1363, y: 235, surfers: 6 },
  { name: 'Timika', province: 'Papua Tengah', x: 1511, y: 357, surfers: 9 },
  { name: 'Jayapura', province: 'Papua', x: 1598, y: 291, surfers: 12 },
  { name: 'Merauke', province: 'Papua Selatan', x: 1558, y: 506, surfers: 7 },
];

export const IndonesiaNetworkMap: React.FC<IndonesiaNetworkMapProps> = ({
  onSelectRegion,
  selectedRegion = 'nasional',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const svgMountRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [currentRegion, setCurrentRegion] = useState<IndonesianRegionId>(selectedRegion || 'nasional');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metricMode, setMetricMode] = useState<'surfers' | 'hits' | 'quality'>('surfers');
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sync internal state if selectedRegion prop changes externally
  useEffect(() => {
    if (selectedRegion && selectedRegion !== currentRegion) {
      setCurrentRegion(selectedRegion);
    }
  }, [selectedRegion]);

  const [hoveredData, setHoveredData] = useState<{
    province: string;
    regency: string;
    stats?: ProvinceTrafficStats;
    x: number;
    y: number;
  } | null>(null);

  // Compute National Totals
  const nationalTotals = useMemo(() => {
    const list = Object.values(PROVINCE_TRAFFIC_DATA);
    const surfers = list.reduce((a, b) => a + b.surfers, 0);
    const hits = list.reduce((a, b) => a + b.dailyHits, 0);
    return { surfers, hits, totalProvinces: list.length };
  }, []);

  // Top 5 Provinces by current metric
  const topProvinces = useMemo(() => {
    const list = Object.values(PROVINCE_TRAFFIC_DATA);
    return [...list]
      .sort((a, b) => {
        if (metricMode === 'hits') return b.dailyHits - a.dailyHits;
        if (metricMode === 'quality') return b.antiCheatScore - a.antiCheatScore;
        return b.surfers - a.surfers;
      })
      .slice(0, 5);
  }, [metricMode]);

  // Load and initialize the SVG with D3
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    fetch('./maps/indonesia.svg')
      .then((res) => {
        if (!res.ok) return fetch('/maps/indonesia.svg');
        return res;
      })
      .then((res) => {
        if (!res.ok) throw new Error('Peta indonesia.svg tidak dapat dimuat');
        return res.text();
      })
      .then((svgText) => {
        if (isCancelled) return;
        if (!svgMountRef.current) return;

        // Clean out any leftover XML headers or DOCTYPE to prevent D3 XML parse errors
        const cleanedText = svgText
          .replace(/<\?xml[^>]*\?>/gi, '')
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .trim();

        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanedText, 'image/svg+xml');
        const parsedSvg = doc.querySelector('svg');

        if (!parsedSvg) {
          throw new Error('Gagal mem-parsing elemen SVG');
        }

        // Clear existing mount
        const mount = d3.select(svgMountRef.current);
        mount.selectAll('*').remove();

        // Standardize SVG attributes for D3 viewport manipulation
        parsedSvg.setAttribute('id', 'd3_indonesia_svg');
        parsedSvg.setAttribute('width', '100%');
        parsedSvg.setAttribute('height', '100%');
        parsedSvg.setAttribute('viewBox', '0 0 1630.898 600');
        parsedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        parsedSvg.style.width = '100%';
        parsedSvg.style.height = '100%';
        parsedSvg.style.display = 'block';

        // Wrap existing contents in a D3 Zoom Container <g id="d3-viewport-container">
        const zoomContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        zoomContainer.setAttribute('id', 'd3-viewport-container');

        while (parsedSvg.firstChild) {
          zoomContainer.appendChild(parsedSvg.firstChild);
        }
        parsedSvg.appendChild(zoomContainer);

        // Ensure all map outlines and polygons never scale or blow up during zoom
        parsedSvg.querySelectorAll('path, polygon, polyline, line').forEach((el) => {
          el.setAttribute('vector-effect', 'non-scaling-stroke');
        });

        // Mount the parsed SVG into the DOM
        svgMountRef.current.appendChild(parsedSvg);

        // Setup D3 Zoom Behavior
        const svgSelection = d3.select<SVGSVGElement, unknown>(parsedSvg);
        const containerSelection = d3.select<SVGGElement, unknown>(zoomContainer);

        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.7, 8])
          .interpolate((d3.interpolateZoom as typeof d3.interpolateZoom & { rho: (r: number) => typeof d3.interpolateZoom }).rho(1.2))
          .on('zoom', (event) => {
            const k = event.transform.k;
            containerSelection.attr('transform', event.transform);

            // Keep city circle sizes, halos, dots, and labels visually constant and small on screen
            containerSelection.selectAll('.radar-center-circle')
              .attr('r', 4.5 / k)
              .attr('stroke-width', 1.5 / k);

            containerSelection.selectAll('.radar-pulse-halo')
              .attr('r', 12 / k);

            containerSelection.selectAll('.radar-center-dot')
              .attr('r', 1.5 / k);

            containerSelection.selectAll<SVGTextElement, RadarNode>('.radar-city-label')
              .attr('font-size', `${10.5 / k}px`)
              .attr('y', (d) => (d && d.y > 450 ? 14 / k : -8 / k));
          });

        zoomBehaviorRef.current = zoom;
        svgSelection.call(zoom);

        // Insert Background Ocean Subtle Grid
        const defs = containerSelection.insert('defs', ':first-child');
        const pattern = defs
          .append('pattern')
          .attr('id', 'd3GridPattern')
          .attr('width', 40)
          .attr('height', 40)
          .attr('patternUnits', 'userSpaceOnUse');

        pattern
          .append('path')
          .attr('d', 'M 40 0 L 0 0 0 40')
          .attr('fill', 'none')
          .attr('stroke', 'rgba(255,255,255,0.03)')
          .attr('stroke-width', '1');

        containerSelection
          .insert('rect', ':first-child')
          .attr('width', 1630.898)
          .attr('height', 600)
          .attr('fill', 'url(#d3GridPattern)')
          .style('pointer-events', 'none');

        // Insert Ocean labels in D3
        const oceanGroup = containerSelection
          .insert('g', 'rect + *')
          .attr('class', 'ocean-labels')
          .style('pointer-events', 'none')
          .style('user-select', 'none');

        oceanGroup
          .append('text')
          .attr('x', 240)
          .attr('y', 550)
          .attr('fill', 'rgba(148, 163, 184, 0.12)')
          .attr('font-size', '16')
          .attr('font-family', 'monospace')
          .attr('letter-spacing', '6')
          .text('SAMUDRA HINDIA');

        oceanGroup
          .append('text')
          .attr('x', 1150)
          .attr('y', 110)
          .attr('fill', 'rgba(148, 163, 184, 0.12)')
          .attr('font-size', '16')
          .attr('font-family', 'monospace')
          .attr('letter-spacing', '6')
          .text('SAMUDRA PASIFIK');

        oceanGroup
          .append('text')
          .attr('x', 670)
          .attr('y', 130)
          .attr('fill', 'rgba(148, 163, 184, 0.12)')
          .attr('font-size', '14')
          .attr('font-family', 'monospace')
          .attr('letter-spacing', '4')
          .text('LAUT NATUNA');

        // Setup Radar Overlay Layer in D3
        const radarLayer = containerSelection.append('g').attr('id', 'd3-radar-layer');

        // Data Transmission Backbone Lines
        const backboneConnections = [
          [STRATEGIC_RADAR_NODES[2], STRATEGIC_RADAR_NODES[3]], // Jakarta -> Bandung
          [STRATEGIC_RADAR_NODES[3], STRATEGIC_RADAR_NODES[4]], // Bandung -> Semarang
          [STRATEGIC_RADAR_NODES[4], STRATEGIC_RADAR_NODES[5]], // Semarang -> Surabaya
          [STRATEGIC_RADAR_NODES[5], STRATEGIC_RADAR_NODES[6]], // Surabaya -> Denpasar
          [STRATEGIC_RADAR_NODES[2], STRATEGIC_RADAR_NODES[1]], // Jakarta -> Palembang
          [STRATEGIC_RADAR_NODES[1], STRATEGIC_RADAR_NODES[0]], // Palembang -> Medan
          [STRATEGIC_RADAR_NODES[2], STRATEGIC_RADAR_NODES[7]], // Jakarta -> Pontianak
          [STRATEGIC_RADAR_NODES[5], STRATEGIC_RADAR_NODES[8]], // Surabaya -> Balikpapan
          [STRATEGIC_RADAR_NODES[5], STRATEGIC_RADAR_NODES[9]], // Surabaya -> Makassar
          [STRATEGIC_RADAR_NODES[9], STRATEGIC_RADAR_NODES[10]], // Makassar -> Manado
          [STRATEGIC_RADAR_NODES[9], STRATEGIC_RADAR_NODES[11]], // Makassar -> Ambon
          [STRATEGIC_RADAR_NODES[11], STRATEGIC_RADAR_NODES[12]], // Ambon -> Sorong (Papua Barat Daya)
          [STRATEGIC_RADAR_NODES[12], STRATEGIC_RADAR_NODES[13]], // Sorong -> Manokwari (Papua Barat)
          [STRATEGIC_RADAR_NODES[13], STRATEGIC_RADAR_NODES[15]], // Manokwari -> Jayapura (Papua)
          [STRATEGIC_RADAR_NODES[15], STRATEGIC_RADAR_NODES[14]], // Jayapura -> Timika (Papua Tengah)
          [STRATEGIC_RADAR_NODES[14], STRATEGIC_RADAR_NODES[16]], // Timika -> Merauke (Papua Selatan)
        ];

        const backboneG = radarLayer.append('g').attr('class', 'backbone-lines');

        backboneConnections.forEach(([from, to]) => {
          backboneG
            .append('line')
            .attr('class', 'backbone-line')
            .attr('x1', from.x)
            .attr('y1', from.y)
            .attr('x2', to.x)
            .attr('y2', to.y)
            .attr('stroke', 'rgba(16, 185, 129, 0.45)')
            .attr('stroke-width', '1.6')
            .attr('stroke-dasharray', '5 4')
            .attr('vector-effect', 'non-scaling-stroke')
            .style('vector-effect', 'non-scaling-stroke')
            .style('pointer-events', 'none');
        });

        // Pulsing Node Circles
        const nodesG = radarLayer.append('g').attr('class', 'pulse-nodes');

        STRATEGIC_RADAR_NODES.forEach((node) => {
          const nodeItem = nodesG
            .append('g')
            .attr('class', 'radar-node-item')
            .attr('transform', `translate(${node.x}, ${node.y})`)
            .datum(node)
            .style('cursor', 'pointer');

          // Pulse halo
          nodeItem
            .append('circle')
            .attr('class', 'radar-pulse-halo animate-pulse')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 12)
            .attr('fill', 'rgba(16, 185, 129, 0.25)');

          // Center solid circle
          nodeItem
            .append('circle')
            .attr('class', 'radar-center-circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 4.5)
            .attr('fill', '#10B981')
            .attr('stroke', '#022c22')
            .attr('stroke-width', '1.5');

          // White center specular dot
          nodeItem
            .append('circle')
            .attr('class', 'radar-center-dot')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 1.5)
            .attr('fill', '#ffffff');

          // Text label
          nodeItem
            .append('text')
            .attr('class', 'radar-city-label')
            .attr('x', 0)
            .attr('y', node.y > 450 ? 14 : -8)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '10.5')
            .attr('font-weight', '600')
            .attr('font-family', 'sans-serif')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 3px rgba(0,0,0,0.9)')
            .text(node.name);
        });

        setIsLoading(false);
      })
      .catch((err) => {
        console.error('D3 map loading error:', err);
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // D3 Reactive Color Interpolation & Path Event Manipulation
  useEffect(() => {
    if (!svgMountRef.current || isLoading) return;

    const svg = d3.select(svgMountRef.current).select('svg');
    if (svg.empty()) return;

    // D3 Sequential Color Scales based on selected metric mode
    const maxSurfers = 520;
    const maxHits = 14500;

    const colorScaleSurfers = d3
      .scaleLinear<string>()
      .domain([0, 15, 60, 150, 300, maxSurfers])
      .range(['#1e293b', '#064e3b', '#047857', '#059669', '#10b981', '#34d399']);

    const colorScaleHits = d3
      .scaleLinear<string>()
      .domain([0, 500, 2000, 5000, 9000, maxHits])
      .range(['#1e293b', '#0e7490', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9']);

    const colorScaleQuality = d3
      .scaleLinear<string>()
      .domain([99.0, 99.4, 99.7, 100.0])
      .range(['#1e293b', '#047857', '#10b981', '#4ade80']);

    const q = searchQuery.toLowerCase().trim();

    // Select all 515 administrative regency paths inside provinces
    const paths = svg.selectAll<SVGPathElement, unknown>('path[data-regency]');

    paths.each(function () {
      const pathEl = d3.select(this);
      const province = pathEl.attr('data-province') || '';
      const regency = pathEl.attr('data-regency') || '';
      const stats = PROVINCE_TRAFFIC_DATA[province];

      const matchesSearch =
        q.length > 0 &&
        (regency.toLowerCase().includes(q) || province.toLowerCase().includes(q));

      // Calculate fill color with D3
      let targetFill = '#1e293b';

      if (matchesSearch) {
        targetFill = '#f59e0b'; // Amber-500 highlight for search hits
      } else if (stats) {
        if (metricMode === 'hits') {
          targetFill = colorScaleHits(stats.dailyHits);
        } else if (metricMode === 'quality') {
          targetFill = colorScaleQuality(stats.antiCheatScore);
        } else {
          targetFill = colorScaleSurfers(stats.surfers);
        }
      }

      // Check if region filter is active
      const isRegionSelected =
        currentRegion === 'nasional' ||
        (stats && stats.regionId === currentRegion);

      // D3 Transition for smooth color animation
      pathEl
        .attr('vector-effect', 'non-scaling-stroke')
        .style('vector-effect', 'non-scaling-stroke')
        .transition('fill-transition')
        .duration(450)
        .ease(d3.easeCubicOut)
        .style('fill', isRegionSelected ? targetFill : 'rgba(15, 23, 42, 0.85)')
        .style(
          'stroke',
          matchesSearch
            ? '#fef08a'
            : isRegionSelected
            ? 'rgba(255, 255, 255, 0.35)'
            : 'rgba(51, 65, 85, 0.25)'
        )
        .style('stroke-width', matchesSearch ? '1.4px' : '0.25px');

      pathEl.style('cursor', 'pointer');
    });

    // Helper: Position tooltip inside map boundary without overflowing or hiding
    const computeTooltipPosition = (event: MouseEvent, province: string, regency: string) => {
      const vpRect = mapViewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;

      const mouseX = event.clientX - vpRect.left;
      const mouseY = event.clientY - vpRect.top;

      const tooltipWidth = 230;
      const tooltipHeight = 180;
      const pad = 12;

      // Horizontal positioning: flip if too close to right edge
      let posX = mouseX + 16;
      if (posX + tooltipWidth > vpRect.width - pad) {
        posX = mouseX - tooltipWidth - 16;
      }
      if (posX < pad) {
        posX = pad;
      }

      // Vertical positioning: center vertically on cursor, flip or clamp if out of bounds
      let posY = mouseY - tooltipHeight / 2;
      if (posY < pad) {
        posY = pad;
      }
      if (posY + tooltipHeight > vpRect.height - pad) {
        posY = Math.max(pad, vpRect.height - tooltipHeight - pad);
      }

      const stats = PROVINCE_TRAFFIC_DATA[province];
      setHoveredData({
        province,
        regency,
        stats,
        x: posX,
        y: posY,
      });
    };

    // D3 Interactive Mouse Events
    paths
      .on('mouseover', function (event: MouseEvent) {
        const pathEl = d3.select(this);
        const province = pathEl.attr('data-province') || '';
        const regency = pathEl.attr('data-regency') || '';

        // Highlight with bright neon cyan
        pathEl
          .raise()
          .attr('vector-effect', 'non-scaling-stroke')
          .style('vector-effect', 'non-scaling-stroke')
          .transition()
          .duration(120)
          .style('fill', '#06b6d4')
          .style('stroke', '#67e8f9')
          .style('stroke-width', '1.2px');

        computeTooltipPosition(event, province, regency);
      })
      .on('mousemove', function (event: MouseEvent) {
        const pathEl = d3.select(this);
        const province = pathEl.attr('data-province') || '';
        const regency = pathEl.attr('data-regency') || '';
        computeTooltipPosition(event, province, regency);
      })
      .on('mouseout', function () {
        const pathEl = d3.select(this);
        const province = pathEl.attr('data-province') || '';
        const regency = pathEl.attr('data-regency') || '';
        const stats = PROVINCE_TRAFFIC_DATA[province];

        const matchesSearch =
          q.length > 0 &&
          (regency.toLowerCase().includes(q) || province.toLowerCase().includes(q));

        let originalFill = '#1e293b';
        if (matchesSearch) {
          originalFill = '#f59e0b';
        } else if (stats) {
          if (metricMode === 'hits') originalFill = colorScaleHits(stats.dailyHits);
          else if (metricMode === 'quality') originalFill = colorScaleQuality(stats.antiCheatScore);
          else originalFill = colorScaleSurfers(stats.surfers);
        }

        const isRegionSelected =
          currentRegion === 'nasional' ||
          (stats && stats.regionId === currentRegion);

        pathEl
          .attr('vector-effect', 'non-scaling-stroke')
          .style('vector-effect', 'non-scaling-stroke')
          .transition()
          .duration(180)
          .style('fill', isRegionSelected ? originalFill : 'rgba(15, 23, 42, 0.85)')
          .style(
            'stroke',
            matchesSearch
              ? '#fef08a'
              : isRegionSelected
              ? 'rgba(255, 255, 255, 0.35)'
              : 'rgba(51, 65, 85, 0.25)'
          )
          .style('stroke-width', matchesSearch ? '1.4px' : '0.25px');

        setHoveredData(null);
      })
      .on('click', function () {
        const pathEl = d3.select(this);
        const province = pathEl.attr('data-province') || '';
        const stats = PROVINCE_TRAFFIC_DATA[province];

        if (stats) {
          handleSelectProvince(province, stats.regionId);
        }
      });

    // Update radar node highlights based on active region
    svg.selectAll<SVGGElement, RadarNode>('.radar-node-item').each(function (d) {
      if (!d) return;
      const stats = PROVINCE_TRAFFIC_DATA[d.province];
      const isTargetRegion = currentRegion === 'nasional' || (stats && stats.regionId === currentRegion);

      const nodeEl = d3.select(this);
      nodeEl.select('.radar-pulse-halo')
        .transition('halo-glow')
        .duration(450)
        .style('opacity', isTargetRegion ? 1 : 0.15);

      nodeEl.select('.radar-center-circle')
        .transition('center-glow')
        .duration(450)
        .attr('fill', isTargetRegion ? '#10B981' : '#047857');

      nodeEl.select('.radar-city-label')
        .transition('label-glow')
        .duration(450)
        .style('opacity', isTargetRegion ? 1 : 0.3);
    });

    // Backbone lines subtle dimming for non-active regions
    svg.selectAll<SVGLineElement, unknown>('.backbone-line')
      .transition('backbone-fade')
      .duration(450)
      .style('opacity', currentRegion === 'nasional' ? 0.85 : 0.45);

    // Toggle Radar Layer Visibility
    svg.select('#d3-radar-layer').style('display', showRadar ? 'inline' : 'none');
  }, [isLoading, metricMode, currentRegion, searchQuery, showRadar, onSelectRegion]);

  // Smoothly pan & zoom D3 map to targeted SVG coordinates & scale with natural flight path
  const zoomToTarget = (targetX: number, targetY: number, k: number) => {
    if (!svgMountRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgMountRef.current).select<SVGSVGElement>('svg');
    if (svg.empty()) return;

    const centerX = 1630.898 / 2;
    const centerY = 600 / 2;

    let targetTransform: d3.ZoomTransform;
    if (k <= 1.05 && Math.abs(targetX - 815.45) < 1) {
      targetTransform = d3.zoomIdentity;
    } else {
      targetTransform = d3.zoomIdentity
        .translate(centerX - targetX * k, centerY - targetY * k)
        .scale(k);
    }

    // Get current camera transform to compute physical distance and flight duration
    const currentTransform = d3.zoomTransform(svg.node()!);
    const currentTargetX = (centerX - currentTransform.x) / currentTransform.k;
    const currentTargetY = (centerY - currentTransform.y) / currentTransform.k;

    const distance = Math.hypot(targetX - currentTargetX, targetY - currentTargetY);
    const scaleDiff = Math.abs(Math.log2(k / currentTransform.k));

    // Calculate dynamic duration for natural, organic flight feel:
    // Small step: ~800ms, long cross-archipelago flight: ~1200-1400ms
    const baseDuration = 750;
    const distanceDuration = Math.min(500, (distance / 1200) * 500);
    const zoomDuration = Math.min(300, scaleDiff * 150);
    const totalDuration = Math.round(Math.max(700, Math.min(1450, baseDuration + distanceDuration + zoomDuration)));

    // Cancel any previous camera motion cleanly and start organic transition
    svg
      .interrupt('camera-glide')
      .transition('camera-glide')
      .duration(totalDuration)
      .ease(d3.easeCubicInOut)
      .call(zoomBehaviorRef.current.transform, targetTransform);
  };

  // Zoom to designated Indonesian geographical region
  const handleSelectRegion = (regionId: IndonesianRegionId) => {
    setCurrentRegion(regionId);
    onSelectRegion?.(regionId);
    const target = REGION_BOUNDS[regionId] || REGION_BOUNDS.nasional;
    zoomToTarget(target.x, target.y, target.k);
  };

  // Zoom to designated Province
  const handleSelectProvince = (provName: string, regionId: IndonesianRegionId) => {
    setCurrentRegion(regionId);
    onSelectRegion?.(regionId);
    const provCoord = PROVINCE_COORDINATES[provName];
    if (provCoord) {
      zoomToTarget(provCoord.x, provCoord.y, provCoord.k);
    } else {
      const target = REGION_BOUNDS[regionId] || REGION_BOUNDS.nasional;
      zoomToTarget(target.x, target.y, target.k);
    }
  };

  // Search input change with automatic bounding box zoom
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !svgMountRef.current || !zoomBehaviorRef.current) return;

    const svg = d3.select(svgMountRef.current).select<SVGSVGElement>('svg');
    const q = query.toLowerCase().trim();
    const matchedPath = svg.select<SVGPathElement>(`path[data-regency*="${q}" i], path[data-province*="${q}" i]`);

    if (!matchedPath.empty()) {
      const node = matchedPath.node();
      if (node) {
        try {
          const bbox = node.getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            const targetX = bbox.x + bbox.width / 2;
            const targetY = bbox.y + bbox.height / 2;
            const k = Math.min(5.5, Math.max(3.2, 700 / Math.max(bbox.width, bbox.height, 80)));
            zoomToTarget(targetX, targetY, k);
          }
        } catch {
          // ignore if layout not ready
        }
      }
    }
  };

  // Programmatic D3 Zoom Controls
  const handleZoomIn = () => {
    if (!svgMountRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgMountRef.current).select<SVGSVGElement>('svg');
    svg
      .interrupt('camera-glide')
      .transition('camera-glide')
      .duration(450)
      .ease(d3.easeCubicOut)
      .call(zoomBehaviorRef.current.scaleBy, 1.4);
  };

  const handleZoomOut = () => {
    if (!svgMountRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgMountRef.current).select<SVGSVGElement>('svg');
    svg
      .interrupt('camera-glide')
      .transition('camera-glide')
      .duration(450)
      .ease(d3.easeCubicOut)
      .call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    handleSelectRegion('nasional');
    setSearchQuery('');
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-5 overflow-hidden transition-all shadow-xl"
    >
      {/* Header with Title & Live Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-100">
              Peta Distribusi Trafik
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 font-mono font-semibold">
              38 Provinsi Resmi · 515 Daerah
            </span>
          </div>
        </div>

        {/* Global Traffic Counters */}
        <div className="flex items-center gap-4 text-xs bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <span className="text-slate-400 text-[11px] block">Surfer Online:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm tabular-nums">
                {nationalTotals.surfers.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-800" />

          <div>
            <span className="text-slate-400 text-[11px] block">Hits 24 Jam:</span>
            <span className="font-mono font-bold text-cyan-400 text-sm tabular-nums">
              {nationalTotals.hits.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Metric Switcher, Search, Zoom, Radar Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-800/60 text-xs">
        {/* Metric Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-500 px-2 font-medium">Metrik:</span>
          <button
            onClick={() => setMetricMode('surfers')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              metricMode === 'surfers'
                ? 'bg-emerald-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Surfer Aktif</span>
          </button>
          <button
            onClick={() => setMetricMode('hits')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              metricMode === 'hits'
                ? 'bg-cyan-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Volume Hits</span>
          </button>
          <button
            onClick={() => setMetricMode('quality')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              metricMode === 'quality'
                ? 'bg-emerald-700 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Anti-Cheat</span>
          </button>
        </div>

        {/* Right Tools: Search & D3 Zoom Buttons */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kota/Kabupaten..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-6 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-48 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  handleResetZoom();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle Backbone Radar Lines */}
          <button
            onClick={() => setShowRadar(!showRadar)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
              showRadar
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Tampilkan Jaringan Node Backbone"
          >
            <Zap className="w-3 h-3" />
            <span className="hidden sm:inline">Radar</span>
          </button>

          {/* D3 Zoom Controls */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Perbesar Peta (D3 Zoom In)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Perkecil Peta (D3 Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Reset Viewport Peta"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Full-Width Interactive Map Canvas */}
      <div className="mt-4 space-y-4">
        <div
          ref={mapViewportRef}
          className="relative w-full aspect-[21/9] min-h-[340px] max-h-[500px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner"
        >
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-slate-400 z-10">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span className="text-xs font-medium">Memuat dan mengindeks Peta Indonesia...</span>
            </div>
          )}

          {/* D3 Target SVG Mount Point */}
          <div
            ref={svgMountRef}
            className="w-full h-full select-none cursor-grab active:cursor-grabbing"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Choropleth Legend Bar at bottom left of map */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 text-[11px] backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-3">
            <span className="text-slate-400 font-medium">Intensitas:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[10px]">Rendah</span>
              <div
                className="w-20 h-2 rounded-full"
                style={{
                  background:
                    metricMode === 'hits'
                      ? 'linear-gradient(to right, #0e7490, #06b6d4, #67e8f9)'
                      : metricMode === 'quality'
                      ? 'linear-gradient(to right, #047857, #10b981, #4ade80)'
                      : 'linear-gradient(to right, #064e3b, #10b981, #34d399)',
                }}
              />
              <span className="text-emerald-400 text-[10px] font-semibold">Tinggi</span>
            </div>
          </div>

          {/* Live Floating Tooltip inside Map Viewport with boundary-safe positioning */}
          {hoveredData && (
            <div
              className="absolute z-30 pointer-events-none transition-[left,top] duration-75 ease-out"
              style={{
                left: `${hoveredData.x}px`,
                top: `${hoveredData.y}px`,
              }}
            >
              <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs w-[230px] space-y-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate max-w-[140px]">{hoveredData.regency}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-mono">
                    Online
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Provinsi: <span className="text-slate-200 font-medium">{hoveredData.province}</span>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800/60 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Surfer Provinsi:</span>
                    <span className="font-mono font-bold text-emerald-400 tabular-nums">
                      {hoveredData.stats ? hoveredData.stats.surfers : 20} Peselancar
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Volume Hits:</span>
                    <span className="font-mono font-bold text-cyan-400 tabular-nums">
                      {hoveredData.stats ? hoveredData.stats.dailyHits.toLocaleString('id-ID') : '1.200'} Hits/hari
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Anti-Cheat Score:</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {hoveredData.stats ? hoveredData.stats.antiCheatScore : 99.8}% Aman
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/40">
                  Klik untuk menargetkan wilayah ini
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Top 5 Provinsi Teraktif Box Beneath Map */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              Top 5 Provinsi Teraktif
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Presisi IP ISP Lokal
              </span>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-slate-500 font-mono">Live Ranking</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {topProvinces.map((prov, idx) => {
              const percent = Math.min(100, Math.round((prov.surfers / 520) * 100));
              const isSelected = currentRegion === prov.regionId;

              return (
                <div
                  key={prov.name}
                  onClick={() => handleSelectProvince(prov.name, prov.regionId)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/70 border-emerald-600/60 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-200 truncate">{prov.name}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-[11px] tabular-nums shrink-0">
                        {metricMode === 'hits'
                          ? `${prov.dailyHits.toLocaleString('id-ID')} hits`
                          : metricMode === 'quality'
                          ? `${prov.antiCheatScore}%`
                          : `${prov.surfers}`}
                      </span>
                    </div>

                    {/* Progress track */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 mt-2 truncate">
                    Hub: {prov.topCities.slice(0, 3).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Region Chips / Filter Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-400 mr-1 flex items-center gap-1 font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Filter Regional:
        </span>
        <button
          onClick={() => handleSelectRegion('nasional')}
          className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
            currentRegion === 'nasional'
              ? 'bg-emerald-600 text-white font-medium shadow-sm ring-1 ring-emerald-400/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Semua Nusantara (38 Prov)
        </button>
        {INDONESIAN_REGIONS.filter((r) => r.id !== 'nasional').map((reg) => (
          <button
            key={reg.id}
            onClick={() => handleSelectRegion(reg.id)}
            className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
              currentRegion === reg.id
                ? 'bg-emerald-600 text-white font-medium shadow-sm ring-1 ring-emerald-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {REGION_SHORT_LABELS[reg.id] || reg.name}
          </button>
        ))}
      </div>
    </div>
  );
};
