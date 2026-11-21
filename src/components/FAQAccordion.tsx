import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ShieldCheck,
  Coins,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  VwsGridFrame,
  VwsColumnDivider,
  VwsTopLine,
  VwsRowDivider,
} from './VwsSmartLine';

export type FAQCategoryId = 'all' | 'anticheat' | 'points';

export interface FAQItem {
  id: string;
  category: Exclude<FAQCategoryId, 'all'>;
  question: string;
  answer: string;
  actionLabel?: string;
  actionType?: 'anticheat' | 'pricing' | 'websites' | 'referral';
}

export const DEFAULT_HELP_FAQS: FAQItem[] = [
  {
    id: 'faq-timer-pause',
    category: 'anticheat',
    question: 'Mengapa timer selancar otomatis berhenti saat saya pindah tab atau meminimalkan browser?',
    answer:
      'Mesin Visibility Guard memantau fokus layar secara real-time untuk memastikan setiap kunjungan benar-benar dilihat manusia. Jika tab selancar berada di latar belakang atau jendela diminimalkan, hitungan detik otomatis dijeda dan dilanjutkan kembali begitu tab dibuka aktif.',
    actionLabel: 'Buka Konsol Anti-Cheat',
    actionType: 'anticheat',
  },
  {
    id: 'faq-entropy-pop',
    category: 'anticheat',
    question: 'Bagaimana cara kerja pelacak entropi kursor dan tantangan Proof-of-Presence (PoP)?',
    answer:
      'Sistem menganalisis pola kurva serta jeda gerakan kursor/guliran secara wajar. Jika tidak terdeteksi interaksi sama sekali dalam durasi panjang (AFK) atau gerakan terlihat linear seperti bot, tantangan Proof-of-Presence akan muncul untuk memverifikasi kehadiran manusia.',
  },
  {
    id: 'faq-multitab',
    category: 'anticheat',
    question: 'Bolehkah membuka lebih dari satu tab Selancar Trafik secara bersamaan?',
    answer:
      'Tidak. Lapisan Konkurensi Multi-Tab (BroadcastChannel) membatasi 1 akun browser hanya menjalankan 1 sesi selancar aktif pada satu waktu. Membuka tab ganda akan otomatis mengunci sesi untuk mencegah kecurangan poin.',
  },
  {
    id: 'faq-suspended',
    category: 'anticheat',
    question: 'Apa yang harus dilakukan jika muncul spanduk Akun Ditangguhkan (Suspended)?',
    answer:
      'Penangguhan terjadi apabila sistem mencatat pelanggaran berulang seperti manipulasi jam browser (speed-hack), sesi multi-tab ilegal, atau skrip bot otomatis. Periksa catatan alasan di spanduk atas lalu hubungi administrator melalui menu Profil untuk peninjauan ulang.',
    actionLabel: 'Periksa Log Integritas',
    actionType: 'anticheat',
  },
  {
    id: 'faq-points-ratio',
    category: 'points',
    question: 'Bagaimana perhitungan konversi waktu selancar menjadi poin (Rasio 70% vs 100%)?',
    answer:
      'Member Gratis menerima rasio pertukaran 70% (kunjungan 30 detik bernilai 1.00 poin menghasilkan +0.70 poin ke saldo). Member Pro Nusantara VIP menerima rasio penuh 100% tanpa potongan (+1.00 poin penuh setiap kunjungan 30 detik).',
    actionLabel: 'Lihat Paket & Upgrade VIP',
    actionType: 'pricing',
  },
  {
    id: 'faq-daily-bonus-referral',
    category: 'points',
    question: 'Bagaimana cara mendapatkan bonus +50 poin harian dan komisi referral 15%?',
    answer:
      'Capai target selancar harian 30 menit per hari untuk membuka bonus streak +50 poin secara otomatis. Selain itu, bagikan tautan referral pribadi Anda untuk memperoleh komisi pasif 15% dari setiap poin selancar rekan yang mendaftar melalui tautan Anda.',
    actionLabel: 'Buka Program Referral',
    actionType: 'referral',
  },
  {
    id: 'faq-no-hits',
    category: 'points',
    question: 'Website saya berstatus Aktif, tetapi kunjungan belum bertambah. Apa penyebabnya?',
    answer:
      'Pastikan tiga syarat berikut terpenuhi: (1) sisa Poin Dialokasikan pada kampanye website masih cukup untuk minimal 1 kunjungan, (2) batas hit harian belum tercapai hari ini, dan (3) status Audit Kepatuhan website sudah Disetujui (Approved).',
    actionLabel: 'Kelola Website Saya',
    actionType: 'websites',
  },
  {
    id: 'faq-refund-points',
    category: 'points',
    question: 'Apakah sisa poin yang dialokasikan kembali ke saldo jika website dihapus?',
    answer:
      'Ya. Seluruh sisa poin kampanye yang belum terpakai akan otomatis dikembalikan 100% ke Saldo Poin utama akun Anda saat website dihapus. Jika hanya ingin menghentikan sementara tanpa menghapus statistik, gunakan tombol Jeda.',
    actionLabel: 'Buka Website Saya',
    actionType: 'websites',
  },
];

interface FAQAccordionProps {
  items?: FAQItem[];
  searchQuery?: string;
  onActionClick?: (actionType: NonNullable<FAQItem['actionType']>) => void;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items = DEFAULT_HELP_FAQS,
  searchQuery = '',
  onActionClick,
}) => {
  const [activeCategory, setActiveCategory] = useState<FAQCategoryId>('all');
  const [openId, setOpenId] = useState<string>(items[0]?.id ?? '');

  const counts = useMemo(
    () => ({
      all: items.length,
      anticheat: items.filter((i) => i.category === 'anticheat').length,
      points: items.filter((i) => i.category === 'points').length,
    }),
    [items]
  );

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchCat = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [items, activeCategory, searchQuery]);

  const filterTabs: {
    id: FAQCategoryId;
    label: string;
    subtitle: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'all',
      label: 'Semua Pertanyaan',
      subtitle: 'Anti-Cheat & Poin',
      count: counts.all,
      icon: <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
    {
      id: 'anticheat',
      label: 'Sistem Anti-Cheat',
      subtitle: 'Tab fokus, entropi & PoP',
      count: counts.anticheat,
      icon: <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />,
    },
    {
      id: 'points',
      label: 'Poin, Rasio & Kampanye',
      subtitle: '70% vs 100%, bonus & refund',
      count: counts.points,
      icon: <Coins className="w-4 h-4 text-amber-400 shrink-0" />,
    },
  ];

  return (
    <section
      aria-label="Pertanyaan Umum Anti-Cheat dan Poin"
      className="relative bg-slate-900/60"
    >
      <VwsGridFrame hasBackground overhangPx={18} bleedPx={18} />

      {/* Header */}
      <div className="p-6 sm:p-8 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ CEPAT · ANTI-CHEAT & POIN</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              Pertanyaan Umum Sistem Anti-Cheat & Poin
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Jawaban cepat seputar mekanisme perlindungan 6 lapis, jeda timer otomatis, perhitungan rasio poin, dan pengelolaan saldo kampanye.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 shrink-0">
            Menampilkan{' '}
            <span className="text-emerald-400 font-semibold">{filteredFaqs.length}</span> dari{' '}
            {items.length} topik
          </div>
        </div>
      </div>

      {/* Gapless 3-Column vws-line* Category Filter Strip */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 bg-slate-950/40">
        <VwsGridFrame hasBackground={false} overhangPx={12} bleed={false} />
        {filterTabs.map((tab, idx) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id);
                const firstMatch = items.find(
                  (i) => tab.id === 'all' || i.category === tab.id
                );
                if (firstMatch) setOpenId(firstMatch.id);
              }}
              className={`vws-grid-cell px-5 py-3.5 text-left transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                isActive
                  ? 'bg-emerald-500/10 text-white'
                  : 'text-slate-300 hover:bg-slate-900/70'
              }`}
            >
              {idx > 0 && <VwsColumnDivider visibleFrom="sm" overhangPx={12} />}
              {idx > 0 && <VwsTopLine bleed={false} className="sm:hidden" />}
              <div className="flex items-center gap-2.5 min-w-0">
                {tab.icon}
                <div className="min-w-0">
                  <div
                    className={`text-xs font-semibold truncate ${
                      isActive ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{tab.subtitle}</div>
                </div>
              </div>
              <span
                className={`text-xs font-mono tabular-nums shrink-0 px-2 py-0.5 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accordion Rows */}
      <div className="px-6 sm:px-8 py-2">
        {filteredFaqs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-xs sm:text-sm text-slate-400">
              Tidak ada FAQ yang cocok dengan pencarian "{searchQuery}".
            </p>
            {activeCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="mt-3 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
              >
                Tampilkan Semua Kategori FAQ
              </button>
            )}
          </div>
        ) : (
          filteredFaqs.map((item, idx) => {
            const isOpen = openId === item.id;
            const isAntiCheat = item.category === 'anticheat';
            return (
              <React.Fragment key={item.id}>
                {idx > 0 && <VwsRowDivider />}
                <div
                  className={`py-4 transition-colors ${
                    isOpen ? 'bg-emerald-500/[0.04] -mx-4 px-4' : ''
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? '' : item.id)}
                    className="w-full flex items-start justify-between gap-4 text-left cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-emerald-400/90 mt-0.5 shrink-0 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                              isAntiCheat ? 'text-cyan-400' : 'text-amber-400'
                            }`}
                          >
                            {isAntiCheat ? 'Anti-Cheat' : 'Poin & Rasio'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors block leading-snug">
                          {item.question}
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-3 pl-7 pr-2 space-y-3">
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-4xl">
                        {item.answer}
                      </p>
                      {item.actionLabel && item.actionType && onActionClick && (
                        <button
                          type="button"
                          onClick={() => onActionClick(item.actionType!)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors"
                        >
                          <span>{item.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
    </section>
  );
};
