import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  QrCode,
  CreditCard,
  Crown,
  Zap,
  ArrowRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { POINT_PACKAGES, VIP_MEMBERSHIP } from '../data/mockData';
import { UserProfile } from '../types';
import { APP_NAME, APP_CONFIG } from '../config/appConfig';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onAddUserPoints: (points: number) => void;
  onUpgradeToVip: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  user,
  onAddUserPoints,
  onUpgradeToVip,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<{
    type: 'points' | 'vip';
    name: string;
    points: number;
    priceIdr: number;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bca_va' | 'gopay' | 'mandiri_va'>('qris');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartCheckout = (type: 'points' | 'vip', name: string, points: number, priceIdr: number) => {
    setSelectedPlan({ type, name, points, priceIdr });
    setPaymentSuccess(false);
  };

  const handleSimulatePayment = () => {
    if (!selectedPlan) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);

      if (selectedPlan.type === 'points') {
        onAddUserPoints(selectedPlan.points);
      } else {
        onUpgradeToVip();
        onAddUserPoints(5000); // VIP welcome bonus
      }

      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedPlan(null);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!selectedPlan ? (
          <div>
            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                PAKET {APP_NAME.toUpperCase()} & UPGRADE VIP
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                Tingkatkan Kunjungan Website Anda
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Dapatkan puluhan ribu pengunjung Indonesia asli tanpa perlu berselancar manual, atau upgrade akun Pro VIP untuk rasio 100%.
              </p>
            </div>

            {/* VIP Banner */}
            <div className="mb-8 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-slate-100">
                    Keanggotaan Pro Nusantara VIP
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                    REKOMENDASI
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Rasio selancar 100% penuh + 20 slot website + prioritas antrean tercepat se-Indonesia.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                  <span>✓ 20 Slot Situs</span>
                  <span>✓ Target Spesifik Kota</span>
                  <span>✓ Bebas Gangguan CAPTCHA</span>
                </div>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <div className="text-lg font-bold text-slate-100">
                  Rp {VIP_MEMBERSHIP.pricePerMonthIdr.toLocaleString('id-ID')}
                  <span className="text-xs text-slate-400 font-normal"> /bulan</span>
                </div>
                <button
                  onClick={() =>
                    handleStartCheckout('vip', 'Pro Nusantara VIP', 5000, VIP_MEMBERSHIP.pricePerMonthIdr)
                  }
                  className="mt-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-amber-900/20"
                >
                  {user.membership === 'pro_nusantara' ? 'Perpanjang VIP' : 'Upgrade VIP Sekarang'}
                </button>
              </div>
            </div>

            {/* Point Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {POINT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                    pkg.popular
                      ? 'border-emerald-500/60 bg-slate-900/90 shadow-xl'
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  <div>
                    {pkg.popular && (
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                        Paling Banyak Dipilih
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-slate-100">{pkg.name}</h4>
                    <div className="mt-2 mb-3">
                      <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                        {(pkg.points + pkg.bonusHits).toLocaleString('id-ID')}{' '}
                        <span className="text-xs text-slate-300 font-sans font-normal">Poin</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Rp {pkg.priceIdr.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                      {pkg.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleStartCheckout(
                        'points',
                        pkg.name,
                        pkg.points + pkg.bonusHits,
                        pkg.priceIdr
                      )
                    }
                    className="mt-6 w-full py-2 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  >
                    Pilih Paket
                  </button>
                </div>
              ))}
            </div>

            {/* Local payment reassurance */}
            <div className="mt-8 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-slate-400" />
                QRIS Instan Semua Bank & E-Wallet
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Transfer BCA & Mandiri VA Otomatis
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Garansi Poin Masuk Seketika
              </span>
            </div>
          </div>
        ) : (
          /* Checkout Payment Drawer */
          <div className="max-w-md mx-auto py-2">
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-xs text-slate-400 hover:text-slate-200 mb-4 inline-block cursor-pointer"
            >
              ← Kembali ke Pilihan Paket
            </button>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 mb-5">
              <div className="text-xs text-slate-400">Ringkasan Pembelian:</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">
                {selectedPlan.name}
              </div>
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">Total Poin:</span>
                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                  +{selectedPlan.points.toLocaleString('id-ID')} Poin
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-slate-400">Total Tagihan:</span>
                <span className="font-mono tabular-nums text-slate-100 font-bold text-sm">
                  Rp {selectedPlan.priceIdr.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Pilih Metode Pembayaran Indonesia:
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'qris', label: 'QRIS (Semua E-Wallet/Bank)', desc: 'GoPay, OVO, Dana, BCA' },
                  { id: 'bca_va', label: 'BCA Virtual Account', desc: 'Verifikasi instan 24 jam' },
                  { id: 'gopay', label: 'GoPay / GoTo', desc: 'Bayar via aplikasi Gojek' },
                  { id: 'mandiri_va', label: 'Mandiri Livin VA', desc: 'Transfer Bank Mandiri' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      paymentMethod === m.id
                        ? 'border-emerald-500 bg-emerald-950/30 text-white'
                        : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{m.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* QRIS Display or VA code */}
              {paymentMethod === 'qris' ? (
                <div className="mt-4 p-5 rounded-xl border border-slate-800 bg-slate-950 text-center flex flex-col items-center">
                  <div className="text-xs font-semibold text-slate-200 mb-2">
                    Pindai Kode QRIS Standar Bank Indonesia
                  </div>
                  {/* Generated QR visual */}
                  <div className="w-44 h-44 bg-white p-3 rounded-lg flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950 fill-current">
                      {/* Stylized QR Code matrix */}
                      <rect x="0" y="0" width="30" height="30" />
                      <rect x="5" y="5" width="20" height="20" fill="#FFF" />
                      <rect x="10" y="10" width="10" height="10" />

                      <rect x="70" y="0" width="30" height="30" />
                      <rect x="75" y="5" width="20" height="20" fill="#FFF" />
                      <rect x="80" y="10" width="10" height="10" />

                      <rect x="0" y="70" width="30" height="30" />
                      <rect x="5" y="75" width="20" height="20" fill="#FFF" />
                      <rect x="10" y="80" width="10" height="10" />

                      {/* Random data blocks */}
                      <rect x="36" y="10" width="8" height="8" />
                      <rect x="50" y="10" width="8" height="8" />
                      <rect x="40" y="30" width="20" height="8" />
                      <rect x="10" y="45" width="15" height="15" />
                      <rect x="35" y="45" width="10" height="10" />
                      <rect x="55" y="45" width="10" height="10" />
                      <rect x="75" y="40" width="15" height="15" />
                      <rect x="35" y="70" width="12" height="12" />
                      <rect x="60" y="70" width="15" height="8" />
                      <rect x="55" y="85" width="20" height="10" />
                      <rect x="85" y="75" width="10" height="10" />
                    </svg>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    NMID: ID1020084920912 · {APP_CONFIG.legalEntity}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950">
                  <div className="text-xs text-slate-400">Nomor Virtual Account:</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 tracking-wider mt-1 select-all">
                    8920 1029 8839 2011
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Atas Nama: <strong className="text-slate-300">{APP_CONFIG.fullName} / {user.name}</strong>
                  </div>
                </div>
              )}

              {paymentSuccess ? (
                <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Pembayaran Terverifikasi! Saldo poin berhasil ditambahkan ke akun Anda.</span>
                </div>
              ) : (
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full mt-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  {isProcessing ? (
                    <span>Memverifikasi Pembayaran Otomatis...</span>
                  ) : (
                    <>
                      <span>Konfirmasi Pembayaran Selesai</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
