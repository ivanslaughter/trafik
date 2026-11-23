import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
  LogIn,
  UserPlus,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  ChevronDown,
  BookOpen,
  MapPin,
} from 'lucide-react';
import { APP_NAME, APP_CONFIG, PAYMENTS_ENABLED } from '../config/appConfig';
import { UserProfile, GeoStatus } from '../types';
import { wpAuthService } from '../services/wordpressAuthService';
import { BrandLogoConfig } from '../utils/logoBranding';
import { BrandMark } from './BrandMark';
import { VwsTopLine, VwsBottomLine, VwsColumnDivider, VwsGridFrame, VwsRowDivider } from './VwsSmartLine';
import { HeroIndonesiaAnimatedMap } from './HeroIndonesiaAnimatedMap';
import regionalTargetingImg from '../assets/images/vel_regional_targeting_1795023164349.webp';
import { AntiCheatAnimatedSvg } from './AntiCheatAnimatedSvg';
import contentAuditImg from '../assets/images/vel_content_audit_1795023165678.webp';
import trafficRotationImg from '../assets/images/vel_traffic_rotation_1795023166516.webp';

interface LandingPageProps {
  currentUser: UserProfile;
  brandLogo?: BrandLogoConfig;
  isLiveConnected: boolean;
  initialScrollToAuth?: boolean;
  onEnterWorkspace: (targetTab?: string) => void;
  onAuthenticatedUser: (user: UserProfile) => void;
}

const REGION_HIGHLIGHTS = [
  { id: 'jabodetabek', name: 'Jabodetabek', share: '34%', cities: 'Jakarta · Bekasi · Tangerang · Depok · Bogor' },
  { id: 'jawa_barat', name: 'Jawa Barat', share: '16%', cities: 'Bandung · Cimahi · Cirebon · Tasikmalaya' },
  { id: 'jawa_timur', name: 'Jawa Timur', share: '15%', cities: 'Surabaya · Malang · Sidoarjo · Kediri' },
  { id: 'jawa_tengah', name: 'Jawa Tengah & DIY', share: '13%', cities: 'Semarang · Yogyakarta · Surakarta' },
  { id: 'sumatera', name: 'Sumatera', share: '11%', cities: 'Medan · Palembang · Pekanbaru · Padang' },
  { id: 'bali_nusra', name: 'Bali & Nusra', share: '5%', cities: 'Denpasar · Mataram · Kupang' },
  { id: 'kalimantan', name: 'Kalimantan', share: '3%', cities: 'Balikpapan · Samarinda · Pontianak' },
  { id: 'sulawesi', name: 'Sulawesi & Papua', share: '3%', cities: 'Makassar · Manado · Jayapura' },
];

const QUICK_GUIDE_STEPS = [
  {
    step: '01',
    title: 'Buat Akun Member',
    summary: 'Register gratis dengan email aktif Anda dan langsung terima 1.500 poin awal tanpa perlu kartu kredit.',
    tip: 'Gunakan email aktif agar progres poin dan laporan kampanye tersimpan aman.',
  },
  {
    step: '02',
    title: 'Daftarkan URL Website',
    summary: 'Masukkan alamat website, blog, toko online, atau channel video Anda lalu pilih target wilayah dan perangkat.',
    tip: 'Setiap URL otomatis dipindai filter anti-judi & kepatuhan konten sebelum tayang.',
  },
  {
    step: '03',
    title: 'Jalankan Selancar Aktif',
    summary: 'Buka menu Selancar Trafik untuk mengunjungi situs sesama member selama 20–45 detik dan kumpulkan poin tambahan.',
    tip: 'Pastikan tab browser tetap terbuka di layar dan jangan membuka tab selancar ganda.',
  },
  {
    step: '04',
    title: 'Pantau Kunjungan Masuk',
    summary: 'Poin yang Anda alokasikan langsung memutar website Anda di jaringan member Indonesia secara real-time.',
    tip: 'Atur batas hit harian agar grafik kunjungan di analitik website Anda tumbuh stabil.',
  },
];

const LANDING_FAQS = [
  {
    id: 'faq-points',
    question: 'Bagaimana cara menghitung dan mendapatkan poin kunjungan?',
    answer: PAYMENTS_ENABLED
      ? 'Setiap member baru memperoleh bonus 1.500 poin awal. Saat Anda berselancar mengunjungi situs member lain, Anda menerima poin sesuai durasi tayang (rasio 70% untuk Member Gratis dan 100% penuh untuk Pro Nusantara). Anda juga bisa menambah poin melalui program referral 15% atau paket poin instan.'
      : 'Setiap member baru langsung memperoleh bonus 1.500 poin awal secara gratis. Saat Anda berselancar mengunjungi situs member lain, Anda menerima poin sesuai durasi tayang (+0.70 poin per kunjungan 30 detik), ditambah bonus harian +50 poin dan komisi referral 15% tanpa biaya apa pun.',
  },
  {
    id: 'faq-anticheat',
    question: 'Mengapa hitungan mundur selancar berhenti saat saya pindah tab?',
    answer:
      'Mesin Anti-Cheat 6 lapis mendeteksi fokus jendela browser untuk memastikan setiap kunjungan berasal dari mata manusia nyata, bukan tab tersembunyi atau bot. Cukup biarkan tab selancar tetap aktif dan gerakkan kursor secara wajar.',
  },
  {
    id: 'faq-safety',
    question: 'Apakah website saya aman dari situs berbahaya atau pelanggaran iklan?',
    answer:
      'Ya. Seluruh URL baru melewati pemindaian kata kunci terlarang (judi online, phishing, konten dewasa 18+) dan ditayangkan di dalam sandbox HTML5 terisolasi yang memblokir skrip frame-busting serta redirect paksa.',
  },
  {
    id: 'faq-existing',
    question: 'Saya sudah terdaftar sebagai member, di mana saya bisa membaca panduan teknis lengkap?',
    answer:
      'Setelah login ke dasbor member, Anda dapat membuka menu Pusat Bantuan & Panduan Member kapan saja melalui tautan footer atau menu profil untuk melihat tutorial langkah demi langkah, aturan anti-cheat, dan solusi kendala umum.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  brandLogo,
  isLiveConnected,
  initialScrollToAuth = false,
  onEnterWorkspace,
  onAuthenticatedUser,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [selectedRegion, setSelectedRegion] = useState(REGION_HIGHLIGHTS[0]);
  const [openFaqId, setOpenFaqId] = useState<string>(LANDING_FAQS[0].id);

  // Quick Entry Form State (Login or Register)
  const [entryMode, setEntryMode] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Jakarta');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus | null>(wpAuthService.getCachedGeoStatus());

  useEffect(() => {
    if (wpAuthService.getConfig().authMode === 'bridge') {
      wpAuthService.checkGeoAccess().then((status) => setGeoStatus(status));
    }
  }, []);

  useEffect(() => {
    if (initialScrollToAuth) {
      setTimeout(() => {
        document.getElementById('masuk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [initialScrollToAuth]);

  const markImageFailed = (key: string) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  const scrollToAuth = (mode: 'register' | 'login') => {
    setEntryMode(mode);
    setFormError('');
    setFormSuccess('');
    document.getElementById('masuk')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Masukkan alamat email yang valid.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password minimal terdiri dari 6 karakter.');
      return;
    }

    if (entryMode === 'register' && fullName.trim().length < 2) {
      setFormError('Masukkan nama lengkap minimal 2 karakter.');
      return;
    }

    setIsSubmitting(true);
    const wpConfig = wpAuthService.getConfig();

    if (wpConfig.authMode === 'bridge') {
      const res =
        entryMode === 'register'
          ? await wpAuthService.registerWithWordPress(fullName.trim(), cleanEmail, password, city)
          : await wpAuthService.loginWithWordPress(cleanEmail, password);

      setIsSubmitting(false);
      if (res.geoStatus) {
        setGeoStatus(res.geoStatus);
      }
      if (!res.success || !res.user) {
        const sanitizedError = res.message
          .replace(/\b(WordPress|Plugin Bridge|wp_users|MySQL|MariaDB)\b/gi, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        setFormError(sanitizedError || 'Gagal memproses akun. Periksa kembali data Anda.');
        return;
      }

      setFormSuccess(
        entryMode === 'register'
          ? 'Pendaftaran berhasil! Mengarahkan Anda ke dasbor member...'
          : res.geoStatus?.adminBypass
          ? 'Login Administrator berhasil (Geo-Bypass aktif). Mengarahkan ke dasbor...'
          : 'Login berhasil! Mengarahkan Anda ke dasbor member...'
      );
      onAuthenticatedUser(res.user);
      setTimeout(() => onEnterWorkspace('dashboard'), 550);
      return;
    }

    // Standard account onboarding
    const localUser: UserProfile = {
      ...currentUser,
      id: entryMode === 'register' ? 'usr_' + Math.random().toString(36).substring(2, 8) : currentUser.id,
      name: entryMode === 'register' ? fullName.trim() : currentUser.name,
      email: cleanEmail,
      city: city.trim() || 'Indonesia',
      points: entryMode === 'register' ? 1500 : currentUser.points,
      joinedDate: new Date().toISOString().split('T')[0],
      lastActive: 'Aktif sekarang',
    };

    setIsSubmitting(false);
    setFormSuccess(
      entryMode === 'register'
        ? 'Akun berhasil dibuat dengan bonus 1.500 poin awal. Mengarahkan ke dasbor...'
        : 'Berhasil login ke akun Anda. Mengarahkan ke dasbor...'
    );
    onAuthenticatedUser(localUser);
    setTimeout(() => onEnterWorkspace('dashboard'), 550);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md relative">
        <VwsBottomLine bleed={false} />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Logo / Wordmark */}
          <a
            href="#beranda"
            className="group inline-flex items-center whitespace-nowrap shrink-0"
          >
            <BrandMark brandLogo={brandLogo} size="header" />
          </a>

          {/* Zone 2: 5 Single-line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a
              href="#cara-kerja"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Cara Kerja
            </a>
            <a
              href="#panduan"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Panduan
            </a>
            <a
              href="#keamanan"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Keamanan
            </a>
            <a
              href="#jangkauan"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Jangkauan
            </a>
            <a
              href="#paket"
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              {PAYMENTS_ENABLED ? 'Paket' : 'Akses Gratis'}
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            {isLiveConnected ? (
              <button
                onClick={() => onEnterWorkspace('dashboard')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Buka Dasbor
              </button>
            ) : (
              <button
                onClick={() => scrollToAuth('login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Login / Register
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="beranda" className="flex-1 overflow-x-clip">
        {/* 1. Hero Section */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Hero Copy (5/12) */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="text-xs font-medium text-emerald-400 mb-3">
                {PAYMENTS_ENABLED
                  ? 'Jaringan Pertukaran Trafik Indonesia · Terverifikasi Anti-Bot'
                  : '100% Gratis Dicoba · Jaringan Pertukaran Trafik Indonesia Terverifikasi Anti-Bot'}
              </div>

              <h1
                className="font-bold tracking-tight text-slate-100 leading-[1.12] [text-wrap:balance]"
                style={{ fontSize: 'clamp(2.1rem, 3.4vw, 3.25rem)' }}
              >
                Trafik Pengunjung Indonesia Asli untuk Website Anda
              </h1>

              <p className="mt-5 text-base text-slate-300 leading-relaxed max-w-xl">
                Tingkatkan kunjungan website bisnis, blog, atau toko online dari audiens nyata di 38 provinsi Indonesia. Setiap sesi kunjungan diverifikasi oleh sistem Anti-Cheat 6 lapis dan filter kepatuhan konten yang ketat.
              </p>

              {/* Single Primary CTA + Quiet Secondary Link */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    if (isLiveConnected) {
                      onEnterWorkspace('dashboard');
                    } else {
                      scrollToAuth('register');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{isLiveConnected ? 'Lanjut ke Dasbor Member' : 'Register Gratis — Bonus 1.500 Poin'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEnterWorkspace('dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Lihat Demo Dasbor</span>
                </button>
              </div>

              <div className="mt-6 text-xs text-slate-400 flex flex-wrap items-center gap-3">
                <span>Sudah memiliki akun member?</span>
                <button
                  onClick={() => scrollToAuth('login')}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 font-medium cursor-pointer"
                >
                  Login ke akun Anda
                </button>
                <span aria-hidden="true">·</span>
                <a
                  href="#panduan"
                  className="text-slate-300 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Baca panduan pemula
                </a>
              </div>
            </div>

            {/* Hero Animated 38-Province Indonesia SVG with Live Trafik Telemetry (7/12) */}
            <div className="lg:col-span-7">
              <HeroIndonesiaAnimatedMap />
            </div>
          </div>

          {/* Full-width 4-Column KPI Strip — Transparent Columns (Top & Bottom + Inner Dividers Only) */}
          <div className="relative mt-10 grid grid-cols-2 lg:grid-cols-4">
            <VwsGridFrame hasBackground={false} overhangPx={22} bleedPx={22} />
            <div className="vws-grid-cell px-4 sm:px-5 py-7">
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100">
                38 Provinsi
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Cakupan penargetan audiens di seluruh Indonesia
              </div>
            </div>
            <div className="vws-grid-cell px-4 sm:px-5 py-7">
              <VwsColumnDivider visibleFrom="always" overhangPx={22} />
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400">
                6 Lapis
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Deteksi tab fokus, entropi kursor & anti speed-hack
              </div>
            </div>
            <div className="vws-grid-cell px-4 sm:px-5 py-7">
              <VwsColumnDivider visibleFrom="lg" overhangPx={22} />
              <VwsTopLine bleed={false} className="lg:hidden" />
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100">
                1.500 Poin
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Saldo poin awal langsung aktif untuk member baru
              </div>
            </div>
            <div className="vws-grid-cell px-4 sm:px-5 py-7">
              <VwsColumnDivider visibleFrom="always" overhangPx={22} />
              <VwsTopLine bleed={false} className="lg:hidden" />
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-100">
                0% Judi / 18+
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Audit kepatuhan konten otomatis & karantina komunitas
              </div>
            </div>
          </div>
        </section>

        {/* 2. Mechanism / Core Capabilities Bento Grid with Flat-Vector SaaS Illustrations */}
        <section id="cara-kerja" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <VwsTopLine bleed={false} />
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
              Mekanisme pertukaran trafik yang adil dan terukur
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
              Setiap poin dihasilkan dari durasi kunjungan nyata di browser aktif—bukan bot otomatis atau tab tersembunyi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 01. Regional Targeting (col-span-2) */}
            <div
              id="jangkauan"
              className="lg:col-span-2 relative bg-slate-900/60 flex flex-col justify-between vws-grid-cell hover:bg-slate-900/75"
            >
              <VwsGridFrame hasBackground overhangPx={14} bleedPx={14} />

              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch h-full">
                <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono text-emerald-400 mb-2">
                      01. Penargetan Wilayah Nusantara & Perangkat
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">
                      Fokuskan kunjungan ke kota & pulau target bisnis Anda
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      Pilih seluruh Indonesia atau saring khusus Jabodetabek, Jawa Barat, Jawa Tengah & DIY, Jawa Timur, Sumatera, Bali & Nusra, Kalimantan, hingga Sulawesi & Papua beserta pilihan perangkat Desktop atau Mobile.
                    </p>
                  </div>

                  {/* Interactive Regional Selector */}
                  <div className="mt-6">
                    <VwsRowDivider className="mb-5" />
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {REGION_HIGHLIGHTS.map((reg) => {
                        const active = selectedRegion.id === reg.id;
                        return (
                          <button
                            key={reg.id}
                            type="button"
                            onClick={() => setSelectedRegion(reg)}
                            className={`px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {reg.name}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative flex items-center justify-between gap-4 text-xs text-slate-300 bg-slate-950/70 p-3.5">
                      <VwsGridFrame hasBackground overhangPx={10} bleedPx={10} />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100">{selectedRegion.name}</div>
                        <div className="text-slate-400 mt-0.5 truncate">{selectedRegion.cities}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono tabular-nums text-base font-bold text-emerald-400">
                          {selectedRegion.share}
                        </div>
                        <div className="text-[11px] text-slate-400">Porsi Aktif</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regional Targeting Vector Illustration */}
                <div className="relative md:col-span-5 bg-[#0f172a] min-h-[220px]">
                  <VwsColumnDivider visibleFrom="md" overhangPx={0} />
                  <VwsTopLine bleed={false} className="md:hidden" />
                  <div className="w-full h-full overflow-hidden">
                    {!failedImages['regional'] ? (
                      <img
                        src={regionalTargetingImg}
                        alt="Ilustrasi vektor penargetan geografis laptop dan ponsel ke pin lokasi"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        onError={() => markImageFailed('regional')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-6">
                        <Globe className="w-10 h-10 text-emerald-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 02. 6-Layer Anti-Cheat (col-span-1) */}
            <div
              id="keamanan"
              className="relative bg-slate-900/60 flex flex-col vws-grid-cell hover:bg-slate-900/75"
            >
              <VwsGridFrame hasBackground overhangPx={14} bleedPx={14} />

              <div className="relative aspect-[4/3] w-full bg-[#0f172a] overflow-hidden">
                <AntiCheatAnimatedSvg />
                <VwsBottomLine bleed={false} />
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono text-emerald-400 mb-2">
                    02. Mesin Anti-Cheat 6 Lapis
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Verifikasi kehadiran manusia secara real-time
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                    Poin hanya dikreditkan jika tab aktif, pergerakan kursor natural, dan tidak ada manipulasi waktu browser.
                  </p>
                </div>

                <div className="mt-5">
                  <VwsRowDivider className="mb-4" />
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Tab Focus & Visibility Lock otomatis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Analisis Entropi Kursor & Uji Proof-of-Presence</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Kunci Multi-Tab (1 sesi aktif per perangkat)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 03. Anti-Gambling & Content Compliance (col-span-1) */}
            <div className="relative bg-slate-900/60 flex flex-col vws-grid-cell hover:bg-slate-900/75">
              <VwsGridFrame hasBackground overhangPx={14} bleedPx={14} />

              <div className="relative aspect-[4/3] w-full bg-[#0f172a] overflow-hidden">
                {!failedImages['audit'] ? (
                  <img
                    src={contentAuditImg}
                    alt="Ilustrasi gerbang pemindaian otomatis kepatuhan konten website"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    onError={() => markImageFailed('audit')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-emerald-400" />
                  </div>
                )}
                <VwsBottomLine bleed={false} />
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono text-emerald-400 mb-2">
                    03. Audit Kepatuhan Konten
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    Bebas situs judi online, phishing, dan konten dewasa
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                    Setiap URL melewati pemindaian kata kunci terlarang serta sandbox HTML5 untuk memblokir percobaan frame-busting maupun redirect paksa.
                  </p>
                </div>
              </div>
            </div>

            {/* 04. Automated Rotation & Campaign Control (col-span-2) */}
            <div className="lg:col-span-2 relative bg-slate-900/60 flex flex-col justify-between vws-grid-cell hover:bg-slate-900/75">
              <VwsGridFrame hasBackground overhangPx={14} bleedPx={14} />

              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch h-full">
                <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono text-emerald-400 mb-2">
                      04. Rotasi Trafik Otomatis & Kontrol Penuh
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">
                      Atur durasi kunjungan, batas harian, dan jadwal tayang
                    </h3>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      Kendalikan aliran pengunjung agar terlihat alami di analitik website Anda. Tambahkan beberapa URL sekaligus, jeda kapan saja, dan pantau setiap poin yang masuk secara transparan.
                    </p>
                  </div>

                  <div className="mt-6">
                    <VwsRowDivider className="mb-5" />
                    <div className="relative grid grid-cols-1 sm:grid-cols-3 bg-slate-950/70 text-xs">
                      <VwsGridFrame hasBackground overhangPx={10} bleedPx={10} />
                      <div className="vws-grid-cell p-3.5 hover:bg-slate-900/60">
                        <Clock className="w-4 h-4 text-emerald-400 mb-2" />
                        <div className="font-semibold text-slate-100">Durasi 15–60 Detik</div>
                        <div className="text-slate-400 mt-1">Sesuaikan lama kunjungan tiap halaman</div>
                      </div>
                      <div className="vws-grid-cell p-3.5 hover:bg-slate-900/60">
                        <VwsColumnDivider visibleFrom="sm" overhangPx={10} />
                        <VwsTopLine bleed={false} className="sm:hidden" />
                        <SlidersHorizontal className="w-4 h-4 text-emerald-400 mb-2" />
                        <div className="font-semibold text-slate-100">Batas Hit Harian</div>
                        <div className="text-slate-400 mt-1">Jaga pertumbuhan trafik tetap stabil</div>
                      </div>
                      <div className="vws-grid-cell p-3.5 hover:bg-slate-900/60">
                        <VwsColumnDivider visibleFrom="sm" overhangPx={10} />
                        <VwsTopLine bleed={false} className="sm:hidden" />
                        <BarChart3 className="w-4 h-4 text-emerald-400 mb-2" />
                        <div className="font-semibold text-slate-100">Laporan Real-Time</div>
                        <div className="text-slate-400 mt-1">Pantau hit terkirim & sisa poin aktif</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traffic Rotation Vector Illustration */}
                <div className="relative md:col-span-5 bg-[#0f172a] min-h-[220px]">
                  <VwsColumnDivider visibleFrom="md" overhangPx={0} />
                  <VwsTopLine bleed={false} className="md:hidden" />
                  <div className="w-full h-full overflow-hidden">
                    {!failedImages['rotation'] ? (
                      <img
                        src={trafficRotationImg}
                        alt="Ilustrasi antrean rotasi halaman website dan grafik pertumbuhan kunjungan"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        onError={() => markImageFailed('rotation')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-6">
                        <BarChart3 className="w-10 h-10 text-emerald-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. How-To Guide for New Users + FAQ for Returning Users */}
        <section id="panduan" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <VwsTopLine bleed={false} />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div className="max-w-2xl">
              <div className="text-xs font-mono text-emerald-400 mb-2">
                Panduan Pengguna Baru & Bantuan Member
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
                Cara mulai dalam 4 langkah praktis
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Ikuti alur singkat di bawah untuk langsung menerima kunjungan pertama ke website Anda, atau pelajari pertanyaan yang paling sering diajukan member.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEnterWorkspace('help')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start md:self-auto"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Buka Pusat Bantuan Lengkap</span>
            </button>
          </div>

          {/* 4-Step Quick Guide Grid — Boxed with Background (Top, Bottom, First & Last + Inner Dividers) */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-slate-900/40">
            <VwsGridFrame hasBackground overhangPx={20} bleedPx={20} />
            {QUICK_GUIDE_STEPS.map((item, idx) => (
              <div
                key={item.step}
                className="vws-grid-cell p-6 flex flex-col justify-between hover:bg-slate-900/80"
              >
                {idx > 0 && (
                  <VwsColumnDivider
                    visibleFrom={idx === 2 ? 'lg' : 'sm'}
                    overhangPx={20}
                  />
                )}
                {idx > 0 && (
                  <VwsTopLine
                    bleed={false}
                    className={idx === 1 ? 'sm:hidden' : 'lg:hidden'}
                  />
                )}
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mb-3">
                    Langkah {item.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-100">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
                <div className="mt-5 text-[11px] text-slate-400 leading-relaxed">
                  <VwsRowDivider className="mb-3" />
                  {item.tip}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive FAQ Accordion */}
          <div className="relative mt-12 bg-slate-900/40 p-6 sm:p-8">
            <VwsGridFrame hasBackground overhangPx={16} bleedPx={16} />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Pertanyaan yang Sering Diajukan (FAQ)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Penjelasan singkat seputar poin selancar, keamanan sandbox, dan aturan akun.
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToAuth('register')}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer self-start sm:self-auto"
              >
                Mulai Register & coba gratis →
              </button>
            </div>

            <div>
              {LANDING_FAQS.map((faq, faqIdx) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <React.Fragment key={faq.id}>
                    {faqIdx > 0 && <VwsRowDivider />}
                    <div className="py-4 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                        className="w-full flex items-center justify-between gap-4 text-left cursor-pointer group"
                      >
                        <span className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-emerald-400' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <p className="mt-2.5 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Social Proof / Webmaster Case Results */}
        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <VwsTopLine bleed={false} />
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">
              Hasil nyata dari pemilik website Indonesia
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Catatan penggunaan dari pengelola blog, media komunitas, dan toko digital lokal.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 bg-slate-900/40">
            <VwsGridFrame hasBackground overhangPx={20} bleedPx={20} />
            <article className="vws-grid-cell p-6 sm:p-7 flex flex-col justify-between hover:bg-slate-900/75">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono mb-3">
                  <span>+165% Kunjungan Harian</span>
                  <span aria-hidden="true">·</span>
                  <span>Target Jabodetabek & Jawa Barat</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  "Sebelumnya bounce rate kampanye trafik kami tinggi karena pengunjung bot luar negeri. Setelah memindahkan kampanye ke {APP_NAME} dengan filter Jawa Barat dan durasi 45 detik, sinyal pembaca organik untuk artikel edukasi kami naik stabil selama 3 bulan berturut-turut."
                </p>
              </div>
              <div className="mt-5 text-xs text-slate-400">
                <VwsRowDivider className="mb-4" />
                <span className="font-semibold text-slate-200">Raka Pratama</span>
                <span aria-hidden="true"> · </span>
                <span>Pengelola Portal Edukasi Digital Bandung</span>
              </div>
            </article>

            <article className="vws-grid-cell p-6 sm:p-7 flex flex-col justify-between hover:bg-slate-900/75">
              <VwsColumnDivider visibleFrom="md" overhangPx={20} />
              <VwsTopLine bleed={false} className="md:hidden" />
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono mb-3">
                  <span>0 Pelanggaran Iklan</span>
                  <span aria-hidden="true">·</span>
                  <span>Durasi Kunjungan 30–60 Detik</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  "Yang paling penting buat kami adalah filter anti-judi dan anti-redirect. Halaman katalog UMKM kami tidak pernah bersanding dengan situs bermasalah, dan poin hasil selancar tim bisa langsung dipakai menaikkan eksposur halaman produk baru."
                </p>
              </div>
              <div className="mt-5 text-xs text-slate-400">
                <VwsRowDivider className="mb-4" />
                <span className="font-semibold text-slate-200">Siti Rahmawati</span>
                <span aria-hidden="true"> · </span>
                <span>Koordinator Katalog UMKM Nusantara</span>
              </div>
            </article>
          </div>
        </section>

        {/* 5. Membership / Free Early Access Section */}
        <section id="paket" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <VwsTopLine bleed={false} />
          {PAYMENTS_ENABLED ? (
            <>
              <div className="max-w-2xl mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                  Pilih paket sesuai kebutuhan website Anda
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Mulai gratis tanpa kartu kredit atau tingkatkan ke Pro Nusantara untuk rasio pertukaran 100%.
                </p>
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-2 bg-slate-900/40">
                <VwsGridFrame hasBackground overhangPx={20} bleedPx={20} />

                {/* Free Plan */}
                <div className="vws-grid-cell p-6 sm:p-8 flex flex-col justify-between hover:bg-slate-900/75">
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-slate-100">Member Gratis</h3>
                      <span className="text-xs font-mono text-slate-400">Rp 0 / selamanya</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2">
                      Cocok untuk blogger dan pemilik situs pemula yang ingin mulai bertukar kunjungan.
                    </p>

                    <VwsRowDivider className="mt-6 mb-5" />
                    <ul className="space-y-3 text-sm text-slate-300">
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Bonus pendaftaran 1.500 poin awal</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Rasio perolehan selancar 70% (0.70 poin/kunjungan)</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Maksimal 3 slot kampanye website aktif</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Komisi referral 15% dari setiap teman baru</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => scrollToAuth('register')}
                    className="mt-8 w-full py-2.5 px-4 border border-slate-700 hover:bg-slate-800 text-slate-100 text-xs font-semibold text-center transition-colors cursor-pointer"
                  >
                    Mulai Akun Gratis
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="vws-grid-cell bg-slate-900/75 p-6 sm:p-8 flex flex-col justify-between hover:bg-slate-900/90">
                  <VwsColumnDivider visibleFrom="md" overhangPx={20} />
                  <VwsTopLine bleed={false} className="md:hidden" />
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-white">Pro Nusantara</h3>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">Rp 149.000 / bulan</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2">
                      Untuk bisnis, agensi SEO, dan penerbit yang membutuhkan volume trafik maksimal.
                    </p>

                    <VwsRowDivider className="mt-6 mb-5" />
                    <ul className="space-y-3 text-sm text-slate-200">
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Rasio perolehan penuh 100% (1.00 poin/kunjungan)</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Hingga 20 slot kampanye website aktif sekaligus</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Prioritas antrean rotasi regional & filter perangkat</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Pembayaran instan via QRIS & Virtual Account</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => onEnterWorkspace('dashboard')}
                    className="mt-8 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold text-center transition-colors cursor-pointer"
                  >
                    Login & Lihat Detail Paket Pro
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="max-w-2xl mb-10">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-2">
                  PROGRAM AKSES AWAL · 100% GRATIS
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                  Coba layanan {APP_NAME} sepenuhnya gratis tanpa biaya
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Tanpa kartu kredit, tanpa langganan bulanan. Register sekarang, klaim bonus 1.500 poin awal, dan mulai datangkan pengunjung asli dari seluruh Indonesia.
                </p>
              </div>

              <div className="relative grid grid-cols-1 md:grid-cols-12 bg-slate-900/50">
                <VwsGridFrame hasBackground overhangPx={20} bleedPx={20} />

                {/* Left: Free Access Offer */}
                <div className="vws-grid-cell md:col-span-5 bg-emerald-500/10 p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-bold text-white">Akses Penuh Gratis</h3>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                        TERBUKA UNTUK SEMUA
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-emerald-400">
                        Rp 0
                      </span>
                      <span className="text-xs text-slate-400">/ tanpa biaya tersembunyi</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                      Cocok untuk blogger, toko online UMKM, portal berita, dan pemilik website yang ingin menguji trafik organik Indonesia secara langsung.
                    </p>
                  </div>

                  <div className="mt-8 space-y-2.5">
                    <button
                      onClick={() => scrollToAuth('register')}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>Register Gratis — Bonus 1.500 Poin</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] text-slate-400 text-center">
                      Aktif instan · Langsung bisa mendaftarkan website Anda
                    </p>
                  </div>
                </div>

                {/* Right: Included Benefits */}
                <div className="vws-grid-cell md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                  <VwsColumnDivider visibleFrom="md" overhangPx={20} />
                  <VwsTopLine bleed={false} className="md:hidden" />

                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      SEMUA YANG ANDA DAPATKAN SECARA GRATIS
                    </div>
                    <VwsRowDivider className="mt-4 mb-5" />

                    <ul className="space-y-3.5 text-sm text-slate-200">
                      <li className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-white">Bonus Pendaftaran 1.500 Poin Awal</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Langsung tersedia di saldo akun baru untuk memutar kunjungan pertama ke situs Anda.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-white">Autosurf Tanpa Batas & Bonus Harian +50 Poin</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Kumpulkan poin terus-menerus dari jaringan pengunjung Indonesia dengan perlindungan Anti-Cheat 6 lapis.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-white">3 Slot Website Aktif + Penargetan 38 Provinsi</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Atur durasi tayang, filter perangkat desktop/mobile, dan batas hit harian agar grafik analitik alami.
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-white">Komisi Referral 15% Pasif Selamanya</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Ajak sesama pemilik website dan dapatkan 15% poin tambahan otomatis dari setiap aktivitas selancar mereka.
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* 6. Interactive New User Signup / Existing Member Entry */}
        <section id="masuk" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <VwsTopLine bleed={false} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
                Siap mendatangkan pengunjung ke website Anda?
              </h2>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Buat akun baru dalam hitungan detik untuk mendapatkan 1.500 poin awal, atau login menggunakan akun member yang sudah terdaftar.
              </p>

              <div className="mt-6 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tanpa instalasi software tambahan di komputer</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mendukung penargetan 38 provinsi & filter perangkat</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verifikasi kunjungan adil & perlindungan sandbox otomatis</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
                {/* Mode Toggle */}
                <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-950 border border-slate-800 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryMode('register');
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      entryMode === 'register'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryMode('login');
                      setFormError('');
                      setFormSuccess('');
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      entryMode === 'login'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                </div>

                {geoStatus && !geoStatus.allowed && !geoStatus.adminBypass && (
                  <div className="mb-4 p-3.5 rounded-lg border border-amber-500/40 bg-amber-950/35 text-amber-200 text-xs flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <strong className="text-amber-100 block">Portal Khusus Pengguna Indonesia ({geoStatus.countryCode})</strong>
                      <span>
                        {geoStatus.message || 'Pendaftaran dan penggunaan member hanya tersedia dari koneksi IP Indonesia tanpa VPN luar negeri.'}{' '}
                        {entryMode === 'login' ? 'Akun Administrator tetap dapat login via bypass.' : 'Gunakan tab Login jika Anda Administrator.'}
                      </span>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="mb-4 p-3 rounded-lg border border-rose-500/50 bg-rose-950/50 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="mb-4 p-3 rounded-lg border border-emerald-500/50 bg-emerald-950/50 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleQuickSubmit} className="space-y-4">
                  {entryMode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Budi Santoso"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          Kota Asal
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Jakarta"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Alamat Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@domainanda.id"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => onEnterWorkspace('dashboard')}
                      className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 cursor-pointer"
                    >
                      Lihat demo dasbor terlebih dahulu
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>
                        {isSubmitting
                          ? 'Memproses...'
                          : entryMode === 'register'
                          ? 'Register & Login Dasbor'
                          : 'Login ke Dasbor'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="relative bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <VwsTopLine bleed={false} />
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center sm:items-start gap-1.5">
              <BrandMark brandLogo={brandLogo} size="footer" />
              <span>{APP_CONFIG.tagline}</span>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-slate-400">
              <a href="#cara-kerja" className="hover:text-slate-200 transition-colors">
                Cara Kerja
              </a>
              <a href="#panduan" className="hover:text-slate-200 transition-colors">
                Panduan
              </a>
              <a href="#keamanan" className="hover:text-slate-200 transition-colors">
                Anti-Cheat
              </a>
              <a href="#paket" className="hover:text-slate-200 transition-colors">
                {PAYMENTS_ENABLED ? 'Paket' : 'Akses Gratis'}
              </a>
              <button
                onClick={() => onEnterWorkspace('help')}
                className="hover:text-slate-200 transition-colors cursor-pointer"
              >
                Pusat Bantuan
              </button>
            </div>
          </div>

          <VwsRowDivider className="my-5" />

          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            © {APP_CONFIG.year} <strong className="font-bold text-slate-300">{APP_NAME}</strong>. Dilindungi undang-undang.
          </div>
        </div>
      </footer>
    </div>
  );
};
