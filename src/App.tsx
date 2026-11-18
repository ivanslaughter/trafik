/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AutosurfViewer } from './components/AutosurfViewer';
import { WebsitesManager } from './components/WebsitesManager';
import { AntiCheatConsole } from './components/AntiCheatConsole';
import { ReferralView } from './components/ReferralView';
import { UserManagementView } from './components/UserManagementView';
import { UserProfileModal } from './components/UserProfileModal';
import { WebsiteAuditConsole } from './components/WebsiteAuditConsole';
import { WordPressAuthModal } from './components/WordPressAuthModal';
import { PricingModal } from './components/PricingModal';
import { HumanVerificationModal } from './components/HumanVerificationModal';
import {
  INITIAL_USER,
  INITIAL_ALL_USERS,
  INITIAL_USER_WEBSITES,
  INITIAL_COMMUNITY_WEBSITES,
} from './data/mockData';
import { UserProfile, WebsiteCampaign, AntiCheatLogEntry } from './types';
import { antiCheatEngine } from './services/antiCheatEngine';
import { ShieldCheck, Heart, ExternalLink, HelpCircle, Ban, AlertTriangle } from 'lucide-react';
import { APP_NAME, APP_CONFIG, getPageTitle } from './config/appConfig';
import { AntiCheatToastContainer, AntiCheatToastItem } from './components/AntiCheatToast';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Dynamic Document Title based on current tab & APP_NAME
  useEffect(() => {
    const tabLabels: Record<string, string> = {
      dashboard: 'Dashboard',
      autosurf: 'Selancar Otomatis',
      websites: 'Kelola Website',
      anticheat: 'Konsol Anti-Cheat',
      referral: 'Afiliasi & Referral',
      users: 'Manajemen Pengguna',
      audit: 'Audit Kepatuhan',
    };
    const currentLabel = tabLabels[currentTab];
    document.title = getPageTitle(currentLabel);
  }, [currentTab]);

  // All Users Database
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('tn_all_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_ALL_USERS;
  });

  // Current Logged-in User Profile State
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('tn_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_USER;
  });

  // Modals
  const [pricingModalOpen, setPricingModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [manualChallengeOpen, setManualChallengeOpen] = useState<boolean>(false);
  const [wpAuthModalOpen, setWpAuthModalOpen] = useState<boolean>(false);

  // Sync users to localStorage
  useEffect(() => {
    localStorage.setItem('tn_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem('tn_user_profile', JSON.stringify(user));
  }, [user]);

  // Keep current user updated in allUsers array
  const handleUpdateCurrentUserData = (updated: Partial<UserProfile>) => {
    const newUserData = { ...user, ...updated };
    setUser(newUserData);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === newUserData.id ? newUserData : u))
    );
  };

  const handleWordPressLoginSuccess = (wpUserData: Partial<UserProfile>) => {
    const existing = allUsers.find((u) => u.email === wpUserData.email);
    if (existing) {
      const merged = { ...existing, ...wpUserData };
      setUser(merged);
      handleUpdateUserInList(merged);
    } else {
      const newWpUser: UserProfile = {
        id: 'usr_wp_' + Math.random().toString(36).substring(2, 7),
        name: wpUserData.name || 'Pengguna WordPress',
        email: wpUserData.email || 'user@velocity.web.id',
        role: wpUserData.role || 'user',
        status: 'active',
        city: 'Indonesia',
        points: 1500,
        membership: wpUserData.membership || 'gratis',
        surfRatio: wpUserData.surfRatio || 0.7,
        totalHitsGiven: 0,
        totalHitsReceived: 0,
        dailySurfedSeconds: 0,
        dailyTargetSeconds: 1800,
        streakDays: 1,
        referralCode: 'WP-' + (wpUserData.name || 'USER').substring(0, 4).toUpperCase(),
        referredCount: 0,
        referralPointsEarned: 0,
        websiteSlots: wpUserData.membership === 'pro_nusantara' ? 20 : 3,
        joinedDate: new Date().toISOString().split('T')[0],
        lastActive: 'Terhubung ke WordPress velocity.web.id',
      };
      setUser(newWpUser);
      setAllUsers((prev) => [newWpUser, ...prev]);
    }
  };

  const handleUpdateUserInList = (updatedUser: UserProfile) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    if (updatedUser.id === user.id) {
      setUser(updatedUser);
    }
  };

  const handleAddUser = (newUser: UserProfile) => {
    setAllUsers((prev) => [newUser, ...prev]);
  };

  const handleSwitchUser = (userId: string) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (targetUser) {
      setUser(targetUser);
    }
  };

  // User's Submitted Websites
  const [userWebsites, setUserWebsites] = useState<WebsiteCampaign[]>(() => {
    const saved = localStorage.getItem('tn_user_websites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_USER_WEBSITES;
  });

  // Pool of Community Websites for Surfing
  const [communityWebsites, setCommunityWebsites] = useState<WebsiteCampaign[]>(
    INITIAL_COMMUNITY_WEBSITES
  );

  // Anti-Cheat Audit Logs
  const [auditLogs, setAuditLogs] = useState<AntiCheatLogEntry[]>(() => [
    {
      id: 'log_seed_1',
      timestamp: Date.now() - 1000 * 60 * 3,
      type: 'HEARTBEAT_VERIFIED',
      title: 'Heartbeat Integritas Valid',
      details:
        'Token detak selancar ke-#18 terverifikasi. Tab fokus aktif di layar pengguna, entropi gerakan 82%, tidak ada manipulasi waktu.',
      severity: 'info',
      metricValue: 'Seq #18 · Entropi 82%',
    },
    {
      id: 'log_seed_2',
      timestamp: Date.now() - 1000 * 60 * 7,
      type: 'POINT_CREDITED',
      title: `+1.00 Poin ${APP_NAME} Dikreditkan`,
      details:
        'Kunjungan 30 detik selesai dengan seluruh cek integritas lolos untuk situs: "Portal Edukasi Digital Nusantara".',
      severity: 'info',
      metricValue: '+1.00 Poin',
    },
    {
      id: 'log_seed_3',
      timestamp: Date.now() - 1000 * 60 * 14,
      type: 'HUMAN_POP_PASSED',
      title: 'Verifikasi Keberadaan Manusia Berhasil',
      details:
        'Tantangan Proof-of-Presence dijawab dengan benar. Sesi selancar diverifikasi asli (bukan bot otomatis).',
      severity: 'info',
      metricValue: 'Verifikasi Lolos',
    },
    {
      id: 'log_seed_4',
      timestamp: Date.now() - 1000 * 60 * 25,
      type: 'FRAME_BUST_INTERCEPTED',
      title: 'Percobaan Frame-Busting Dicegah',
      details:
        'Sandbox HTML5 berhasil menahan skrip pembajak jendela induk yang mencoba memotong antrean selancar.',
      severity: 'warning',
      metricValue: 'Sandbox HTML5',
    },
  ]);

  // Real-Time Anti-Cheat Toast Notifications
  const [antiCheatToasts, setAntiCheatToasts] = useState<AntiCheatToastItem[]>([]);

  // Subscribe to real-time Anti-Cheat Engine events
  useEffect(() => {
    const unsubscribe = antiCheatEngine.subscribe((entry: AntiCheatLogEntry) => {
      setAuditLogs((prev) => [entry, ...prev.slice(0, 49)]); // Keep last 50 logs

      // Real-time Anti-Cheat Toast Notification:
      // Trigger toast whenever suspicious activity (warning or critical severity) is detected
      if (entry.severity === 'warning' || entry.severity === 'critical') {
        const newToast: AntiCheatToastItem = {
          id: entry.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          log: entry,
          createdAt: Date.now(),
          durationMs: entry.severity === 'critical' ? 8500 : 6500,
        };

        setAntiCheatToasts((prev) => {
          // Avoid duplicate identical toasts within 2 seconds
          const isDuplicate = prev.some(
            (t) => t.log.title === entry.title && Date.now() - t.createdAt < 2000
          );
          if (isDuplicate) return prev;
          // Keep maximum 3 stacked toasts to maintain clean visual aesthetic
          return [newToast, ...prev.slice(0, 2)];
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handlers for Anti-Cheat Toast Notifications
  const handleDismissAntiCheatToast = (id: string) => {
    setAntiCheatToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleDismissAllAntiCheatToasts = () => {
    setAntiCheatToasts([]);
  };

  const handleInspectAntiCheatToast = (log: AntiCheatLogEntry) => {
    setCurrentTab('anticheat');
    setAntiCheatToasts((prev) => prev.filter((t) => t.log.id !== log.id));
  };

  // Handlers for Surfing & Points
  const handleAwardPoints = (earnedPoints: number, siteTitle: string) => {
    setUser((prev) => ({
      ...prev,
      points: Number((prev.points + earnedPoints).toFixed(2)),
      totalHitsGiven: prev.totalHitsGiven + 1,
      dailySurfedSeconds: prev.dailySurfedSeconds + 30,
    }));
  };

  const handleDeductSitePoints = (siteId: string, cost: number) => {
    setCommunityWebsites((prev) =>
      prev.map((site) => {
        if (site.id === siteId) {
          const newAllocated = Math.max(0, site.allocatedPoints - cost);
          return {
            ...site,
            allocatedPoints: newAllocated,
            hitsDeliveredToday: site.hitsDeliveredToday + 1,
            totalHitsDelivered: site.totalHitsDelivered + 1,
            status: newAllocated < cost ? 'depleted' : site.status,
          };
        }
        return site;
      })
    );
  };

  const handleAddWebsite = (
    newSiteData: Omit<
      WebsiteCampaign,
      'id' | 'createdAt' | 'hitsDeliveredToday' | 'totalHitsDelivered'
    >
  ) => {
    const newSite: WebsiteCampaign = {
      ...newSiteData,
      id: 'site_' + Math.random().toString(36).substring(2, 9),
      hitsDeliveredToday: 0,
      totalHitsDelivered: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Deduct initial allocated points from balance
    setUser((prev) => ({
      ...prev,
      points: prev.points - newSiteData.allocatedPoints,
    }));

    setUserWebsites((prev) => [newSite, ...prev]);

    // Also add to community surf pool so it can be seen
    setCommunityWebsites((prev) => [newSite, ...prev]);
  };

  const handleToggleWebsiteStatus = (siteId: string) => {
    setUserWebsites((prev) =>
      prev.map((s) => {
        if (s.id === siteId) {
          const newStatus = s.status === 'active' ? 'paused' : 'active';
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
  };

  const handleDeleteWebsite = (siteId: string) => {
    const site = userWebsites.find((s) => s.id === siteId);
    if (!site) return;

    // Refund remaining allocated points back to user
    if (site.allocatedPoints > 0) {
      setUser((prev) => ({
        ...prev,
        points: prev.points + site.allocatedPoints,
      }));
    }

    setUserWebsites((prev) => prev.filter((s) => s.id !== siteId));
    setCommunityWebsites((prev) => prev.filter((s) => s.id !== siteId));
  };

  const handleAddPointsToSite = (siteId: string, amount: number) => {
    if (user.points < amount) return;

    setUser((prev) => ({
      ...prev,
      points: prev.points - amount,
    }));

    setUserWebsites((prev) =>
      prev.map((s) => {
        if (s.id === siteId) {
          return {
            ...s,
            allocatedPoints: s.allocatedPoints + amount,
            status: s.status === 'depleted' ? 'active' : s.status,
          };
        }
        return s;
      })
    );
  };

  const handleAddUserPoints = (amount: number) => {
    setUser((prev) => ({
      ...prev,
      points: prev.points + amount,
    }));
  };

  const handleUpgradeToVip = () => {
    setUser((prev) => ({
      ...prev,
      membership: 'pro_nusantara',
      surfRatio: 1.0, // 100% full ratio
    }));
  };

  const handleApproveWebsite = (siteId: string) => {
    setCommunityWebsites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? {
              ...s,
              auditStatus: 'approved',
              status: 'active',
              auditScore: 0,
              auditNotes: 'Disetujui oleh Administrator. Konten aman.',
            }
          : s
      )
    );
    setUserWebsites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? {
              ...s,
              auditStatus: 'approved',
              status: 'active',
              auditScore: 0,
              auditNotes: 'Disetujui oleh Administrator. Konten aman.',
            }
          : s
      )
    );
  };

  const handleRejectWebsite = (siteId: string, reason: string) => {
    setCommunityWebsites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? {
              ...s,
              auditStatus: 'rejected',
              status: 'paused',
              auditScore: 100,
              auditNotes: reason,
            }
          : s
      )
    );
    setUserWebsites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? {
              ...s,
              auditStatus: 'rejected',
              status: 'paused',
              auditScore: 100,
              auditNotes: reason,
            }
          : s
      )
    );
  };

  const handleQuarantineWebsite = (siteId: string, reason: string) => {
    setCommunityWebsites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? { ...s, auditStatus: 'flagged', auditNotes: reason }
          : s
      )
    );
    setUserWebsites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? { ...s, auditStatus: 'flagged', auditNotes: reason }
          : s
      )
    );
  };

  const handleReportWebsite = (siteId: string, reason: string) => {
    setCommunityWebsites((prev) =>
      prev.map((s) => {
        if (s.id === siteId) {
          const newReportCount = (s.reportedCount || 0) + 1;
          return {
            ...s,
            reportedCount: newReportCount,
            auditStatus: 'flagged',
            auditNotes: `Dilaporkan peselancar (${newReportCount}x): ${reason}. Diisolasi untuk audit kepatuhan.`,
          };
        }
        return s;
      })
    );

    const logEntry: AntiCheatLogEntry = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type: 'FRAME_BUST_INTERCEPTED',
      title: 'Laporan Pelanggaran Konten Diterima',
      details: `Website #${siteId} dilaporkan oleh peselancar dengan alasan: "${reason}". Situs otomatis dikarantina dari rotasi selancar demi pencegahan judi online / 18+.`,
      severity: 'warning',
      metricValue: 'Karantina Otomatis',
    };
    setAuditLogs((prev) => [logEntry, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Strict 3-Zone Top Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        isSurfing={currentTab === 'autosurf'}
        onToggleSurfing={() => {
          if (user.status === 'suspended') {
            alert('Akun Anda ditangguhkan karena pelanggaran anti-cheat. Tidak dapat berselancar.');
            return;
          }
          setCurrentTab(currentTab === 'autosurf' ? 'dashboard' : 'autosurf');
        }}
        onOpenPricing={() => setPricingModalOpen(true)}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Real-time Floating Anti-Cheat Toast Notifications */}
      <AntiCheatToastContainer
        toasts={antiCheatToasts}
        onDismiss={handleDismissAntiCheatToast}
        onDismissAll={handleDismissAllAntiCheatToasts}
        onInspect={handleInspectAntiCheatToast}
      />

      {/* Account Suspended Alert Banner (if user is banned) */}
      {user.status === 'suspended' && (
        <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-3 text-xs text-rose-200">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Akun Ditangguhkan:</strong> {user.suspendReason || 'Terdeteksi aktivitas mencurigakan oleh sistem anti-cheat.'}
              </span>
            </div>
            <button
              onClick={() => setProfileModalOpen(true)}
              className="text-white underline underline-offset-2 hover:text-rose-300 font-semibold cursor-pointer shrink-0"
            >
              Ganti Akun Demo
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            user={user}
            websites={userWebsites}
            logs={auditLogs}
            onStartSurfing={() => {
              if (user.status === 'suspended') {
                alert('Akun Anda ditangguhkan karena pelanggaran anti-cheat. Tidak dapat berselancar.');
                return;
              }
              setCurrentTab('autosurf');
            }}
            onOpenWebsites={() => setCurrentTab('websites')}
            onOpenAntiCheat={() => setCurrentTab('anticheat')}
            onOpenPricing={() => setPricingModalOpen(true)}
          />
        )}

        {currentTab === 'autosurf' && (
          <AutosurfViewer
            user={user}
            websites={communityWebsites}
            onAwardPoints={handleAwardPoints}
            onDeductSitePoints={handleDeductSitePoints}
            onOpenPricing={() => setPricingModalOpen(true)}
            onReportWebsite={handleReportWebsite}
          />
        )}

        {currentTab === 'websites' && (
          <WebsitesManager
            user={user}
            websites={userWebsites}
            onAddWebsite={handleAddWebsite}
            onToggleStatus={handleToggleWebsiteStatus}
            onDeleteWebsite={handleDeleteWebsite}
            onAddPointsToSite={handleAddPointsToSite}
            onOpenPricing={() => setPricingModalOpen(true)}
            onOpenAuditConsole={() => setCurrentTab('audit')}
          />
        )}

        {currentTab === 'audit' && (
          <WebsiteAuditConsole
            websites={communityWebsites}
            onApproveWebsite={handleApproveWebsite}
            onRejectWebsite={handleRejectWebsite}
            onQuarantineWebsite={handleQuarantineWebsite}
          />
        )}

        {currentTab === 'anticheat' && (
          <AntiCheatConsole
            logs={auditLogs}
            onTriggerChallenge={() => setManualChallengeOpen(true)}
          />
        )}

        {currentTab === 'referral' && <ReferralView user={user} />}

        {currentTab === 'users' && (
          <UserManagementView
            users={allUsers}
            currentUser={user}
            onUpdateUser={handleUpdateUserInList}
            onAddUser={handleAddUser}
            onSwitchUser={handleSwitchUser}
            onOpenWordPressAuth={() => setWpAuthModalOpen(true)}
          />
        )}
      </main>

      {/* User Profile & Demo Account Switcher Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        allUsers={allUsers}
        onUpdateProfile={handleUpdateCurrentUserData}
        onSwitchUser={handleSwitchUser}
        onOpenWordPressAuth={() => setWpAuthModalOpen(true)}
      />

      {/* WordPress Authentication & Database Integration Modal */}
      <WordPressAuthModal
        isOpen={wpAuthModalOpen}
        onClose={() => setWpAuthModalOpen(false)}
        currentUser={user}
        onWordPressLoginSuccess={handleWordPressLoginSuccess}
      />

      {/* Pricing / Top Up Modal */}
      <PricingModal
        isOpen={pricingModalOpen}
        onClose={() => setPricingModalOpen(false)}
        user={user}
        onAddUserPoints={handleAddUserPoints}
        onUpgradeToVip={handleUpgradeToVip}
      />

      {/* Manual PoP Verification Modal */}
      <HumanVerificationModal
        isOpen={manualChallengeOpen}
        onVerify={(passed) => {
          setManualChallengeOpen(false);
          antiCheatEngine.recordHumanVerificationResult(passed);
        }}
        reason="Uji Coba Verifikasi Keberadaan Manusia (Manual)"
      />

      {/* Clean, Understated Footer conforming to Anti-Slop Guidelines */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">{APP_NAME}</span>
            <span>·</span>
            <span>{APP_CONFIG.tagline}</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setCurrentTab('audit')}
              className="hover:text-slate-200 transition-colors cursor-pointer text-rose-400/90 font-medium"
            >
              Audit Kepatuhan (Anti-Judi/18+)
            </button>
            <button
              onClick={() => setCurrentTab('users')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Manajemen Pengguna
            </button>
            <button
              onClick={() => setCurrentTab('anticheat')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Integritas Anti-Cheat
            </button>
            <button
              onClick={() => setCurrentTab('referral')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Program Afiliasi
            </button>
            <button
              onClick={() => setPricingModalOpen(true)}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Tarif & Beli Poin
            </button>
          </div>

          <div className="text-[11px] text-slate-600">
            © {APP_CONFIG.year} {APP_NAME}. Dilindungi undang-undang.
          </div>
        </div>
      </footer>
    </div>
  );
}
