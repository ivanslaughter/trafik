import React, { useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  Globe,
  ShieldCheck,
  Coins,
  Scale,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { APP_NAME } from '../config/appConfig';
import { UserProfile } from '../types';
import { VwsGridFrame, VwsRowDivider, VwsSmartLine, VwsTopLine } from './VwsSmartLine';
import { FAQAccordion } from './FAQAccordion';

interface HelpGuideViewProps {
  user: UserProfile;
  onStartSurfing: () => void;
  onOpenWebsites: () => void;
  onOpenAntiCheat: () => void;
  onOpenAudit: () => void;
  onOpenReferral: () => void;
  onOpenPricing: () => void;
}

type GuideCategoryId = 'all' | 'campaigns' | 'surfing' | 'points' | 'compliance';

interface GuideArticle {
  id: string;
  category: Exclude<GuideCategoryId, 'all'>;
  title: string;
  summary: string;
  steps: string[];
  note: string;
  actionLabel?: string;
  actionType?: 'surfing' | 'websites' | 'anticheat' | 'audit' | 'referral' | 'pricing';
}

const GUIDE_CATEGORIES: { id: GuideCategoryId; label: string }[] = [
  { id: 'all', label: 'Semua Topik' },
  { id: 'campaigns', label: 'Mulai & Website' },
  { id: 'surfing', label: 'Selancar & Anti-Cheat' },
  { id: 'points', label: 'Poin, VIP & Referral' },
  { id: 'compliance', label: 'Kepatuhan Konten' },
];

const GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: 'guide-add-website',
    category: 'campaigns',
    title: 'Cara Menambahkan & Mengatur Kampanye Website',
    summary:
      'Panduan mendaftarkan URL website, mengatur durasi kunjungan, target wilayah Indonesia, dan alokasi poin agar langsung menerima trafik.',
    steps: [
      'Buka menu Website Saya lalu klik tombol Tambah Website Baru.',
      'Masukkan judul kampanye, URL lengkap (diawali https://), dan pilih kategori konten yang sesuai.',
      'Tentukan durasi kunjungan (15–60 detik), target wilayah (Nasional atau provinsi/kota tertentu), serta batas hit harian agar grafik kunjungan terlihat alami.',
      'Alokasikan sejumlah poin dari saldo Anda. Kampanye berstatus Aktif akan langsung masuk antrean rotasi setelah lolos pemindaian kepatuhan.',
    ],
    note: 'Member Gratis dapat menjalankan hingga 3 slot website aktif secara bersamaan, sedangkan Pro Nusantara hingga 20 slot.',
    actionLabel: 'Buka Website Saya',
    actionType: 'websites',
  },
  {
    id: 'guide-safe-surfing',
    category: 'surfing',
    title: 'Aturan Selancar Aman agar Poin Tidak Terpotong atau Dijeda',
    summary:
      'Cara kerja mesin Anti-Cheat 6 lapis dan alasan mengapa timer selancar otomatis berhenti sementara pada kondisi tertentu.',
    steps: [
      'Jalankan hanya 1 tab Selancar Trafik pada satu waktu di browser Anda (kunci multi-tab mencegah kredit ganda).',
      'Biarkan tab selancar tetap aktif dan terlihat di layar. Jika Anda berpindah ke tab lain atau meminimalkan jendela, penghitung waktu otomatis dijeda.',
      'Gerakkan kursor atau gulir halaman secara wajar agar skor entropi manusia tetap di atas ambang batas verifikasi.',
      'Jika muncul tantangan Proof-of-Presence (PoP), selesaikan dalam waktu yang tersedia untuk membuktikan sesi berjalan oleh pengguna manusia.',
    ],
    note: 'Pelanggaran berulang seperti menjalankan skrip otomatis atau memodifikasi jam browser dapat menangguhkan akun secara otomatis.',
    actionLabel: 'Mulai Selancar Trafik',
    actionType: 'surfing',
  },
  {
    id: 'guide-points-ratio',
    category: 'points',
    title: 'Perhitungan Poin, Rasio 70% vs 100%, & Bonus Harian',
    summary:
      'Memahami konversi waktu selancar menjadi poin kunjungan dan cara memaksimalkan saldo tanpa biaya tambahan.',
    steps: [
      'Member Gratis mendapatkan rasio pertukaran 70% (misal kunjungan 30 detik bernilai 0.70 poin ke saldo Anda).',
      'Member Pro Nusantara mendapatkan rasio penuh 100% (kunjungan 30 detik langsung memberi 1.00 poin penuh).',
      'Selesaikan target selancar harian 30 menit per hari untuk membuka bonus streak tambahan +50 poin.',
      'Bagikan tautan afiliasi Anda di menu Referral untuk memperoleh komisi 15% dari setiap aktivitas teman yang mendaftar.',
    ],
    note: 'Anda juga dapat membeli paket poin instan kapan saja melalui QRIS atau Virtual Account di menu Tarif & Beli Poin.',
    actionLabel: 'Lihat Paket Poin & VIP',
    actionType: 'pricing',
  },
  {
    id: 'guide-compliance-audit',
    category: 'compliance',
    title: 'Standar Audit Kepatuhan Konten (Anti-Judi Online & 18+)',
    summary:
      'Kebijakan ketat untuk menjaga kualitas jaringan pertukaran trafik agar aman bagi penerbit iklan, toko UMKM, dan blog edukasi.',
    steps: [
      'Dilarang keras mendaftarkan URL yang mengandung unsur judi online/slot, pornografi/18+, phishing, malware, atau skrip redirect paksa.',
      'Setiap URL baru dipindai otomatis terhadap kata kunci terlarang. URL dengan skor pelanggaran tinggi akan langsung ditolak.',
      'Saat berselancar, Anda dapat menekan tombol Laporkan Situs jika menemukan halaman yang melanggar aturan agar langsung dikarantina.',
      'Semua halaman tayang dibungkus sandbox HTML5 sehingga skrip frame-busting tidak dapat membajak jendela browser Anda.',
    ],
    note: 'Pastikan website Anda juga mengizinkan tampilan pratinjau agar pengunjung dapat melihat konten Anda dengan baik.',
    actionLabel: 'Buka Audit Kepatuhan',
    actionType: 'audit',
  },
  {
    id: 'guide-referral-network',
    category: 'points',
    title: 'Cara Mengembangkan Poin Pasif Lewat Program Referral',
    summary:
      'Bagikan kode referral unik Anda kepada sesama blogger atau pemilik bisnis untuk memperoleh komisi poin berkelanjutan.',
    steps: [
      'Salin tautan dan kode referral pribadi Anda dari halaman Referral.',
      'Ajak rekan pengelola website mendaftar menggunakan tautan tersebut.',
      'Setiap kali rekan Anda menyelesaikan sesi selancar, sistem otomatis menambahkan komisi poin 15% ke saldo Anda tanpa memotong poin mereka.',
    ],
    note: 'Hindari membuat akun ganda di satu perangkat karena sistem anti-cheat memblokir referral mandiri.',
    actionLabel: 'Buka Program Referral',
    actionType: 'referral',
  },
  {
    id: 'guide-anticheat-logs',
    category: 'surfing',
    title: 'Membaca Log Integritas di Konsol Anti-Cheat',
    summary:
      'Memantau catatan heartbeat selancar, skor entropi kursor, dan riwayat pencegahan gangguan sandbox.',
    steps: [
      'Buka tab Anti-Cheat untuk melihat status 6 lapis perlindungan secara real-time.',
      'Setiap 10–15 detik saat berselancar, log akan mencatat verifikasi heartbeat dan persentase entropi kursor.',
      'Peringatan kuning menandakan jeda fokus tab atau percobaan frame-busting yang berhasil ditahan sandbox, bukan pemblokiran permanen.',
    ],
    note: 'Jika akun Anda berstatus ditangguhkan karena salah deteksi atau pelanggaran sebelumnya, hubungi administrator melalui profil Anda.',
    actionLabel: 'Buka Konsol Anti-Cheat',
    actionType: 'anticheat',
  },
];

export const HelpGuideView: React.FC<HelpGuideViewProps> = ({
  user,
  onStartSurfing,
  onOpenWebsites,
  onOpenAntiCheat,
  onOpenAudit,
  onOpenReferral,
  onOpenPricing,
}) => {
  const [activeCategory, setActiveCategory] = useState<GuideCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GUIDE_ARTICLES.filter((article) => {
      const matchCat = activeCategory === 'all' || article.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.steps.some((s) => s.toLowerCase().includes(q)) ||
        article.note.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const handleActionClick = (actionType?: GuideArticle['actionType']) => {
    switch (actionType) {
      case 'surfing':
        onStartSurfing();
        break;
      case 'websites':
        onOpenWebsites();
        break;
      case 'anticheat':
        onOpenAntiCheat();
        break;
      case 'audit':
        onOpenAudit();
        break;
      case 'referral':
        onOpenReferral();
        break;
      case 'pricing':
        onOpenPricing();
        break;
      default:
        break;
    }
  };

  const getCategoryIcon = (category: GuideArticle['category']) => {
    switch (category) {
      case 'campaigns':
        return <Globe className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'surfing':
        return <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'points':
        return <Coins className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'compliance':
        return <Scale className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative bg-slate-900/70 p-6 sm:p-8">
        <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Pusat Bantuan & Panduan Member {APP_NAME}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Panduan Penggunaan & Pemecahan Masalah
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Halo {user.name.split(' ')[0]}, temukan panduan langkah demi langkah untuk mengelola kampanye website, memaksimalkan poin selancar, dan menjaga skor integritas akun Anda.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full lg:w-80 shrink-0">
            <label htmlFor="help-search" className="sr-only">
              Cari panduan atau kendala
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="help-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik (misal: poin, tab, audit)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Buttons */}
        <VwsRowDivider className="mt-6 mb-5" />
        <div className="flex flex-wrap gap-2">
          {GUIDE_CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Guide Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <div className="text-sm font-semibold text-slate-100">
            Topik tidak ditemukan untuk "{searchQuery}"
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Coba kata kunci lain atau tampilkan semua kategori panduan.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="relative grid grid-cols-1 lg:grid-cols-2 bg-slate-900/70">
          <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />
          {filteredArticles.length > 1 && (
            <VwsSmartLine
              orientation="vertical"
              offsetStart="26px"
              offsetEnd="26px"
              className="hidden lg:block absolute left-1/2 z-10"
              style={{ top: '-18px', height: 'calc(100% + 36px)' }}
            />
          )}
          {filteredArticles.map((article, articleIdx) => {
            const isLeftCol = articleIdx % 2 === 0;
            return (
              <article
                key={article.id}
                className="vws-grid-cell p-6 flex flex-col justify-between hover:bg-slate-900/90"
              >
                {/* Mobile single-column row divider */}
                {articleIdx > 0 && (
                  <VwsTopLine bleedPx={18} className="lg:hidden" />
                )}
                {/* Desktop 2-column continuous row divider with left/right outer fade bleed */}
                {articleIdx >= 2 && (
                  <VwsSmartLine
                    orientation="horizontal"
                    offsetStart={isLeftCol ? '26px' : '0px'}
                    offsetEnd={isLeftCol ? '0px' : '26px'}
                    className="hidden lg:block absolute top-0 z-10"
                    style={{
                      left: isLeftCol ? '-18px' : '0px',
                      right: isLeftCol ? '0px' : '-18px',
                    }}
                  />
                )}
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                    {getCategoryIcon(article.category)}
                    <span>
                      {GUIDE_CATEGORIES.find((c) => c.id === article.category)?.label}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-100">
                  {article.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  {article.summary}
                </p>

                <VwsRowDivider className="mt-5 mb-4" />
                <ol className="space-y-2.5">
                  {article.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 leading-relaxed">
                      <span className="font-mono text-[11px] font-bold text-emerald-400 mt-0.5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6 space-y-3">
                <VwsRowDivider className="mb-4" />
                <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{article.note}</span>
                </div>

                {article.actionLabel && (
                  <button
                    type="button"
                    onClick={() => handleActionClick(article.actionType)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    <span>{article.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              </article>
            );
          })}
        </div>
      )}

      {/* FAQ Accordion: Anti-Cheat & Poin */}
      <FAQAccordion
        searchQuery={searchQuery}
        onActionClick={handleActionClick}
      />
    </div>
  );
};
