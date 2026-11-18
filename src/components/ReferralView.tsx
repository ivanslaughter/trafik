import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  TrendingUp,
  Gift,
  HelpCircle,
  MessageCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { APP_CONFIG, APP_NAME } from '../config/appConfig';

interface ReferralViewProps {
  user: UserProfile;
}

export const ReferralView: React.FC<ReferralViewProps> = ({ user }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const referralUrl = `${APP_CONFIG.url}/ref/${user.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Halo kawan webmaster! Dapatkan ribuan trafik pengunjung Indonesia asli untuk website/blog Anda gratis dengan sistem anti-bot adil di ${APP_CONFIG.fullName}: ${referralUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const mockReferralList = [
    { name: 'Andi Pratama', city: 'Surabaya', date: '26 Sep 2026', pointsEarned: 125, status: 'Aktif Berselancar' },
    { name: 'Siti Rahmawati', city: 'Bandung', date: '24 Sep 2026', pointsEarned: 95, status: 'Aktif Berselancar' },
    { name: 'Hendra Wijaya', city: 'Jakarta Barat', date: '20 Sep 2026', pointsEarned: 110, status: 'Aktif Berselancar' },
    { name: 'Agus Setiawan', city: 'Medan', date: '18 Sep 2026', pointsEarned: 50, status: 'Tidak Aktif' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-slate-100">
          Program Afiliasi & Referral Nusantara
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Ajak sesama blogger, webmaster, dan pebisnis online Indonesia untuk mendapatkan komisi poin pasif seumur hidup.
        </p>
      </div>

      {/* Hero Referral Card */}
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300 mb-3">
            <Gift className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bonus Komisi 15% Seumur Hidup</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-100">
            Dapatkan 15% Poin dari Setiap Kunjungan Teman Anda
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Setiap kali pengguna yang Anda daftarkan berselancar dan menghasilkan poin, Anda secara otomatis menerima bonus 15% langsung ke saldo poin Anda tanpa mengurangi poin teman Anda.
          </p>

          {/* Referral Link Copy Bar */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-2.5 max-w-xl">
            <div className="flex-1 flex items-center px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 font-mono truncate select-all">
              {referralUrl}
            </div>

            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md shadow-emerald-900/30"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Link</span>
                </>
              )}
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-md"
              title="Bagikan ke WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Teman Diundang</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-2">
            {user.referredCount} <span className="text-xs font-sans text-slate-400 font-normal">Orang</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            4 orang aktif berselancar hari ini
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Poin Komisi Didapat</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-2">
            +{user.referralPointsEarned.toLocaleString('id-ID')}{' '}
            <span className="text-xs font-sans text-slate-400 font-normal">Poin</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Setara dengan ~{Math.floor(user.referralPointsEarned / 1.0)} kunjungan gratis
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tingkat Komisi Aktif</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-cyan-400 mt-2">
            15%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Status akun terverifikasi anti-cheat
          </div>
        </div>
      </div>

      {/* Referred Users Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="text-sm font-bold text-slate-100 mb-1">
          Daftar Member yang Anda Undang
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Pemantauan real-time aktivitas peselancar rujukan Anda.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Nama Pengguna</th>
                <th className="pb-3 font-semibold">Wilayah Asal</th>
                <th className="pb-3 font-semibold">Tanggal Daftar</th>
                <th className="pb-3 font-semibold text-right">Poin Komisi</th>
                <th className="pb-3 font-semibold text-right">Status Selancar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {mockReferralList.map((ref, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-medium text-slate-200">{ref.name}</td>
                  <td className="py-3 text-slate-400">{ref.city}</td>
                  <td className="py-3 text-slate-500 font-mono">{ref.date}</td>
                  <td className="py-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                    +{ref.pointsEarned} Poin
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded ${
                        ref.status.includes('Aktif')
                          ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-800/40'
                          : 'text-slate-500 bg-slate-950 border border-slate-800'
                      }`}
                    >
                      {ref.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
