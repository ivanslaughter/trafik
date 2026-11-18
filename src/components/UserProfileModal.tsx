import React, { useEffect, useState } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  LogOut,
  Users,
  Globe,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  allUsers: UserProfile[];
  isLiveConnected?: boolean;
  canReturnToAdmin?: boolean;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSwitchUser: (userId: string) => void;
  onReturnToAdmin?: () => void;
  onOpenWordPressAuth?: () => void;
  onOpenHelp?: () => void;
  onLogout?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  allUsers,
  isLiveConnected = false,
  canReturnToAdmin = false,
  onUpdateProfile,
  onSwitchUser,
  onReturnToAdmin,
  onOpenWordPressAuth,
  onOpenHelp,
  onLogout,
}) => {
  const [name, setName] = useState<string>(user.name);
  const [email, setEmail] = useState<string>(user.email);
  const [city, setCity] = useState<string>(user.city);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Keep form inputs synchronized with the active user whenever user or modal open state changes
  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
    setCity(user.city);
    setSuccessMsg('');
  }, [user.id, user.name, user.email, user.city, isOpen]);

  if (!isOpen) return null;

  const isAdmin = user.role === 'admin';
  const showAccountSwitcher = isAdmin && allUsers.length > 0;
  const showBridgeSettings = isAdmin || !isLiveConnected;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(isLiveConnected ? { name, city } : { name, email, city });
    setSuccessMsg('Profil berhasil diperbarui!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup profil"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-bold text-slate-200">
            {user.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">{user.name}</h3>
              {user.membership === 'pro_nusantara' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  PRO VIP
                </span>
              )}
              {isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">{user.email}</p>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="py-4 space-y-3">
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                value={email}
                readOnly={isLiveConnected}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs font-mono focus:outline-none ${
                  isLiveConnected
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-100 focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kota Domisili
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Simpan Perubahan Profil
          </button>
        </form>

        {/* Actions: Help, Admin Return, Admin Bridge Config, and Logout */}
        <div className="py-3 border-t border-slate-800 space-y-2">
          {canReturnToAdmin && onReturnToAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReturnToAdmin();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-amber-500/50 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Kembali ke Sesi Administrator</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">Admin →</span>
            </button>
          )}

          {onOpenHelp && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHelp();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-emerald-800/60 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Pusat Bantuan & Panduan Penggunaan</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Buka →</span>
            </button>
          )}

          {showBridgeSettings && onOpenWordPressAuth && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWordPressAuth();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-blue-800/60 bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>
                  {isLiveConnected
                    ? 'Pengaturan Integrasi & Database Admin'
                    : 'Login / Integrasi Akun Database'}
                </span>
              </div>
              <span className="text-[10px] text-blue-400 font-mono">Kelola →</span>
            </button>
          )}

          {isLiveConnected && onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-rose-800/50 bg-rose-950/25 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Keluar dari Akun</span>
              </div>
              <span className="text-[10px] text-rose-400 font-mono">Logout →</span>
            </button>
          )}
        </div>

        {/* Account Switcher — Strictly Administrator Only */}
        {showAccountSwitcher && (
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Beralih Akun (Khusus Administrator)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {isLiveConnected ? 'Pengguna Terdaftar' : 'Pilih sesi instan'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {allUsers.map((u) => {
                const isSelected = u.id === user.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u.id);
                      onClose();
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/30 text-white'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.role === 'admin' && (
                          <span className="text-[10px] text-emerald-400 font-mono">[ADMIN]</span>
                        )}
                        {u.status === 'suspended' && (
                          <span className="text-[10px] text-rose-400 font-mono">[BANNED]</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-mono">
                        {u.email} · {u.city}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono tabular-nums text-emerald-400 text-xs font-bold">
                        {u.points.toLocaleString('id-ID')} P
                      </span>
                      <span className="text-[10px] text-slate-500 block capitalize">
                        {u.membership.replace('_', ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
