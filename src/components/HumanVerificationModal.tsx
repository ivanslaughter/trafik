import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface HumanVerificationModalProps {
  isOpen: boolean;
  onVerify: (success: boolean) => void;
  reason?: string;
}

interface ChallengeQuestion {
  question: string;
  subtext: string;
  options: { id: string; label: string; icon: string; isCorrect: boolean }[];
}

const CHALLENGES: ChallengeQuestion[] = [
  {
    question: 'Pilih Ikon Candi Bersejarah Indonesia',
    subtext: 'Verifikasi kehadiran untuk membedakan peselancar asli dari skrip bot otomatis.',
    options: [
      { id: 'opt_1', label: 'Candi Borobudur', icon: '🏛️', isCorrect: true },
      { id: 'opt_2', label: 'Menara Eiffel', icon: '🗼', isCorrect: false },
      { id: 'opt_3', label: 'Piramida Mesir', icon: '🔺', isCorrect: false },
      { id: 'opt_4', label: 'Patung Liberty', icon: '🗽', isCorrect: false },
    ],
  },
  {
    question: 'Pilih Motif Budaya Khas Indonesia',
    subtext: 'Buktikan bahwa Anda berada di depan layar dan aktif memperhatikan.',
    options: [
      { id: 'opt_1', label: 'Origami Jepang', icon: '🦢', isCorrect: false },
      { id: 'opt_2', label: 'Kain Batik Tradisional', icon: '👘', isCorrect: true },
      { id: 'opt_3', label: 'Matryoshka Rusia', icon: '🪆', isCorrect: false },
      { id: 'opt_4', label: 'Sombrero Meksiko', icon: '👒', isCorrect: false },
    ],
  },
  {
    question: 'Hitung Penjumlahan Sederhana: 7 + 6 = ?',
    subtext: 'Jawab dalam waktu sebelum batas hitung mundur berakhir.',
    options: [
      { id: 'opt_1', label: '11', icon: '🔢', isCorrect: false },
      { id: 'opt_2', label: '13', icon: '✅', isCorrect: true },
      { id: 'opt_3', label: '14', icon: '🔢', isCorrect: false },
      { id: 'opt_4', label: '15', icon: '🔢', isCorrect: false },
    ],
  },
];

export const HumanVerificationModal: React.FC<HumanVerificationModalProps> = ({
  isOpen,
  onVerify,
  reason = 'Verifikasi Kehadiran Rutin (Proof-of-Presence)',
}) => {
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeQuestion>(CHALLENGES[0]);
  const [remainingSec, setRemainingSec] = useState<number>(35);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'wrong' | 'success'>('idle');

  useEffect(() => {
    if (isOpen) {
      // Pick random challenge
      const randomIdx = Math.floor(Math.random() * CHALLENGES.length);
      setSelectedChallenge(CHALLENGES[randomIdx]);
      setRemainingSec(35);
      setSelectedOptionId(null);
      setFeedback('idle');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || feedback !== 'idle') return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onVerify(false); // Timed out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, feedback, onVerify]);

  if (!isOpen) return null;

  const handleSelectOption = (optId: string, isCorrect: boolean) => {
    setSelectedOptionId(optId);

    if (isCorrect) {
      setFeedback('success');
      setTimeout(() => {
        onVerify(true);
      }, 700);
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback('idle');
        setSelectedOptionId(null);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl">
        {/* Header with timer */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Pemeriksaan Anti-Bot
              </h3>
              <p className="text-xs text-slate-400">{reason}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-slate-800 border border-slate-700 text-xs font-mono text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums font-semibold">{remainingSec}s</span>
          </div>
        </div>

        {/* Question body */}
        <div className="py-5">
          <p className="text-sm font-semibold text-slate-200">
            {selectedChallenge.question}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {selectedChallenge.subtext}
          </p>

          {/* Options Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {selectedChallenge.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let btnClass = 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700 text-slate-200';

              if (isSelected && feedback === 'success') {
                btnClass = 'border-emerald-500 bg-emerald-950/50 text-emerald-300';
              } else if (isSelected && feedback === 'wrong') {
                btnClass = 'border-rose-500 bg-rose-950/50 text-rose-300';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id, opt.isCorrect)}
                  disabled={feedback === 'success'}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${btnClass}`}
                >
                  <span className="text-2xl mb-1.5">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {feedback === 'wrong' && (
            <p className="text-xs text-rose-400 text-center mt-3 animate-pulse">
              Jawaban belum tepat, silakan coba lagi sebelum waktu habis!
            </p>
          )}

          {feedback === 'success' && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 text-center mt-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verifikasi Berhasil! Melanjutkan selancar...</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            Distribusi Poin Adil
          </span>
          <span>{APP_CONFIG.fullName} Shield v3.2</span>
        </div>
      </div>
    </div>
  );
};
