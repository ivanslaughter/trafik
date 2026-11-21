import React from 'react';
import { Play, Square, Sparkles, User, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { BrandLogoConfig } from '../utils/logoBranding';
import { BrandMark } from './BrandMark';
import { VwsTopLine, VwsBottomLine } from './VwsSmartLine';
import { PAYMENTS_ENABLED } from '../config/appConfig';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: UserProfile;
  brandLogo?: BrandLogoConfig;
  isSurfing: boolean;
  onToggleSurfing: () => void;
  onOpenPricing: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  brandLogo,
  isSurfing,
  onToggleSurfing,
  onOpenPricing,
  onOpenProfile,
}) => {
  const isAdmin = user.role === 'admin';
  const navItems = [
    { id: 'dashboard', label: 'Dasbor' },
    { id: 'autosurf', label: 'Selancar Trafik' },
    { id: 'websites', label: 'Website Saya' },
    { id: 'audit', label: 'Audit Kepatuhan' },
    { id: 'anticheat', label: 'Anti-Cheat' },
    { id: 'referral', label: 'Referral' },
    ...(isAdmin ? [{ id: 'users', label: 'User' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md relative">
      <VwsBottomLine bleed={false} />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Zone logo / wordmark */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="group text-left transition-colors cursor-pointer flex items-center"
        >
          <BrandMark brandLogo={brandLogo} size="header" />
        </button>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap cursor-pointer relative py-1 ${
                  isActive
                    ? 'text-white font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                {item.id === 'users' && user.role === 'admin' && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2.5">
          {/* User Points Badge */}
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors text-xs font-medium text-slate-200 cursor-pointer"
            title={
              PAYMENTS_ENABLED
                ? 'Klik untuk tambah poin atau upgrade VIP'
                : 'Saldo Poin Trafik — Klik untuk mulai selancar gratis'
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono tabular-nums text-emerald-400 font-semibold">
              {user.points.toLocaleString('id-ID')}
            </span>
            <span className="text-slate-400 hidden sm:inline">Poin</span>
          </button>

          {/* Profile / Account Avatar Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 text-xs font-medium text-slate-200 cursor-pointer transition-colors"
            title={isAdmin ? 'Profil Akun & Kontrol Admin' : 'Profil Akun Anda'}
          >
            <div className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              {user.name.substring(0, 1)}
            </div>
            <span className="hidden sm:inline truncate max-w-[90px]">
              {user.name.split(' ')[0]}
            </span>
          </button>

          {/* Primary Action Button: Start/Stop Autosurf */}
          <button
            onClick={onToggleSurfing}
            title={
              isSurfing
                ? 'Hentikan sesi selancar dan kembali ke Dasbor'
                : 'Mulai sesi Selancar Trafik'
            }
            className={`min-h-[40px] flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-sm ${
              isSurfing
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
            }`}
          >
            {isSurfing ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Hentikan Selancar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Mulai Selancar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Compact Mobile Horizontal Scrollable Nav Strip (<lg viewports) */}
      <nav
        aria-label="Navigasi seluler"
        className="lg:hidden relative bg-slate-950/95 px-3 overflow-x-auto no-scrollbar"
      >
        <VwsTopLine bleed={false} />
        <div className="flex items-center gap-1.5 min-w-max py-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

