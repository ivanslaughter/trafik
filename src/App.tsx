/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { wpAuthService } from './services/wordpressAuthService';
import { ShieldCheck, Heart, ExternalLink, HelpCircle, Ban, AlertTriangle } from 'lucide-react';
import { APP_NAME, APP_CONFIG, getPageTitle } from './config/appConfig';
import { AntiCheatToastContainer, AntiCheatToastItem } from './components/AntiCheatToast';
import { LandingPage } from './components/LandingPage';
import { HelpGuideView } from './components/HelpGuideView';

export default function App() {
  // Public Landing Page vs Workspace State
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    if (wpAuthService.isLiveBridgeActive()) return false;
    return sessionStorage.getItem('tn_entered_workspace') !== 'true';
  });

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Dynamic Document Title based on current view & APP_NAME
  useEffect(() => {
    if (showLanding) {
      document.title = getPageTitle();
      return;
    }
    const tabLabels: Record<string, string> = {
      dashboard: 'Dashboard',
      autosurf: 'Selancar Otomatis',
      websites: 'Kelola Website',
      anticheat: 'Konsol Anti-Cheat',
      referral: 'Afiliasi & Referral',
      users: 'Manajemen Pengguna',
      audit: 'Audit Kepatuhan',
      help: 'Panduan & Bantuan',
    };
    const currentLabel = tabLabels[currentTab];
    document.title = getPageTitle(currentLabel);
  }, [currentTab, showLanding]);

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

  const lastEarnedPointsRef = useRef<number>(0);

  // Sync all data from WordPress MySQL via Plugin Bridge
  const syncFromWordPressBridge = useCallback(async () => {
    if (!wpAuthService.isLiveBridgeActive()) return;

    const me = await wpAuthService.fetchMe();
    if (!me) {
      wpAuthService.logout();
      return;
    }

    setUser(me);
    const [websitesData, logsData] = await Promise.all([
      wpAuthService.fetchWebsites(),
      wpAuthService.fetchLogs(),
    ]);

    if (websitesData) {
      setUserWebsites(websitesData.myWebsites);
      if (websitesData.communityWebsites.length > 0) {
        setCommunityWebsites(websitesData.communityWebsites);
      }
    }
    if (logsData && logsData.length > 0) {
      setAuditLogs(logsData);
    }
    if (me.role === 'admin') {
      const adminUsers = await wpAuthService.fetchAdminUsers();
      if (adminUsers && adminUsers.length > 0) {
        setAllUsers(adminUsers);
      }
    } else {
      setAllUsers((prev) => {
        const exists = prev.some((u) => u.id === me.id || u.email === me.email);
        return exists ? prev.map((u) => (u.email === me.email ? me : u)) : [me, ...prev];
      });
    }
  }, []);

  useEffect(() => {
    syncFromWordPressBridge();
  }, [syncFromWordPressBridge]);

  // Keep current user updated in allUsers array + sync to WP MySQL if active
  const handleUpdateCurrentUserData = (updated: Partial<UserProfile>) => {
    const newUserData = { ...user, ...updated };
    setUser(newUserData);
    setAllUsers((prev) =>
      prev.map((u) => (u.id === newUserData.id ? newUserData : u))
    );

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateMe({ name: updated.name, city: updated.city }).then((fresh) => {
        if (fresh) setUser(fresh);
      });
    }
  };

  const handleEnterWorkspace = (targetTab = 'dashboard') => {
    sessionStorage.setItem('tn_entered_workspace', 'true');
    setCurrentTab(targetTab);
    setShowLanding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToLanding = () => {
    sessionStorage.removeItem('tn_entered_workspace');
    setShowLanding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWordPressLoginSuccess = (wpUserData: UserProfile) => {
    if (wpAuthService.isLiveBridgeActive()) {
      setUser(wpUserData);
      syncFromWordPressBridge();
      handleEnterWorkspace('dashboard');
      return;
    }

    const existing = allUsers.find((u) => u.email === wpUserData.email);
    if (existing) {
      const merged = { ...existing, ...wpUserData };
      setUser(merged);
      handleUpdateUserInList(merged);
    } else {
      const newWpUser: UserProfile = {
        ...wpUserData,
        id: wpUserData.id || 'usr_wp_' + Math.random().toString(36).substring(2, 7),
        lastActive: 'Terhubung ke WordPress velocity.web.id',
      };
      setUser(newWpUser);
      setAllUsers((prev) => [newWpUser, ...prev]);
    }
    handleEnterWorkspace('dashboard');
  };

  const handleWordPressLogout = () => {
    setUser(INITIAL_USER);
    setAllUsers(INITIAL_ALL_USERS);
    setUserWebsites(INITIAL_USER_WEBSITES);
    setCommunityWebsites(INITIAL_COMMUNITY_WEBSITES);
    handleReturnToLanding();
  };

  const handleUpdateUserInList = (updatedUser: UserProfile) => {
    setAllUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    if (updatedUser.id === user.id) {
      setUser(updatedUser);
    }
    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateAdminUser(updatedUser.id, updatedUser).then((fresh) => {
        if (fresh) {
          setAllUsers((prev) => prev.map((u) => (u.id === fresh.id ? fresh : u)));
          if (fresh.id === user.id) setUser(fresh);
        }
      });
    }
  };

  const handleAddUser = (newUser: UserProfile) => {
    setAllUsers((prev) => [newUser, ...prev]);
    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.createAdminUser(newUser).then((created) => {
        if (created) {
          setAllUsers((prev) => [created, ...prev.filter((u) => u.id !== newUser.id)]);
        }
      });
    }
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

      if (wpAuthService.isLiveBridgeActive() && entry.type !== 'HEARTBEAT_VERIFIED') {
        wpAuthService.pushLog(entry);
      }

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
  const handleAwardPoints = (earnedPoints: number, _siteTitle: string) => {
    lastEarnedPointsRef.current = earnedPoints;
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService
        .completeSurf({
          siteId,
          earnedPoints: lastEarnedPointsRef.current,
          cost,
          durationSec: 30,
        })
        .then((res) => {
          if (res?.user) setUser(res.user);
          if (res?.campaign) {
            const updated = res.campaign;
            setCommunityWebsites((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            setUserWebsites((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
          }
        });
    }
  };

  const handleAddWebsite = (
    newSiteData: Omit<
      WebsiteCampaign,
      'id' | 'createdAt' | 'hitsDeliveredToday' | 'totalHitsDelivered'
    >
  ) => {
    const tempId = 'site_' + Math.random().toString(36).substring(2, 9);
    const newSite: WebsiteCampaign = {
      ...newSiteData,
      id: tempId,
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.createWebsite(newSiteData).then((res) => {
        if (res) {
          setUser(res.user);
          setUserWebsites((prev) => prev.map((s) => (s.id === tempId ? res.website : s)));
          setCommunityWebsites((prev) => prev.map((s) => (s.id === tempId ? res.website : s)));
        }
      });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateWebsiteAction(siteId, { action: 'toggle_status' }).then((res) => {
        if (res?.website) {
          setUserWebsites((prev) => prev.map((s) => (s.id === siteId ? res.website : s)));
          setCommunityWebsites((prev) => prev.map((s) => (s.id === siteId ? res.website : s)));
        }
      });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.deleteWebsite(siteId).then((res) => {
        if (res?.user) setUser(res.user);
      });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateWebsiteAction(siteId, { action: 'add_points', amount }).then((res) => {
        if (res) {
          setUser(res.user);
          setUserWebsites((prev) => prev.map((s) => (s.id === siteId ? res.website : s)));
          setCommunityWebsites((prev) => prev.map((s) => (s.id === siteId ? res.website : s)));
        }
      });
    }
  };

  const handleAddUserPoints = (amount: number) => {
    setUser((prev) => ({
      ...prev,
      points: prev.points + amount,
    }));
    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateMe({ addPoints: amount }).then((fresh) => {
        if (fresh) setUser(fresh);
      });
    }
  };

  const handleUpgradeToVip = () => {
    setUser((prev) => ({
      ...prev,
      membership: 'pro_nusantara',
      surfRatio: 1.0, // 100% full ratio
    }));
    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateMe({ upgradeVip: true }).then((fresh) => {
        if (fresh) setUser(fresh);
      });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateWebsiteAction(siteId, { action: 'approve' });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateWebsiteAction(siteId, { action: 'reject', reason });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateWebsiteAction(siteId, { action: 'quarantine', reason });
    }
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

    if (wpAuthService.isLiveBridgeActive()) {
      wpAuthService.updateWebsiteAction(siteId, { action: 'report', reason });
      wpAuthService.pushLog(logEntry);
    }
  };

  if (showLanding) {
    return (
      <LandingPage
        currentUser={user}
        isLiveConnected={wpAuthService.isLiveBridgeActive()}
        onEnterWorkspace={handleEnterWorkspace}
        onAuthenticatedUser={(authedUser) => {
          setUser(authedUser);
          setAllUsers((prev) => {
            const exists = prev.some((u) => u.email === authedUser.email);
            return exists
              ? prev.map((u) => (u.email === authedUser.email ? authedUser : u))
              : [authedUser, ...prev];
          });
          if (wpAuthService.isLiveBridgeActive()) {
            syncFromWordPressBridge();
          }
        }}
      />
    );
  }

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
            onOpenHelp={() => setCurrentTab('help')}
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

        {currentTab === 'help' && (
          <HelpGuideView
            user={user}
            onStartSurfing={() => {
              if (user.status === 'suspended') {
                return;
              }
              setCurrentTab('autosurf');
            }}
            onOpenWebsites={() => setCurrentTab('websites')}
            onOpenAntiCheat={() => setCurrentTab('anticheat')}
            onOpenAudit={() => setCurrentTab('audit')}
            onOpenReferral={() => setCurrentTab('referral')}
            onOpenPricing={() => setPricingModalOpen(true)}
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
        onOpenHelp={() => setCurrentTab('help')}
      />

      {/* WordPress Authentication & Database Integration Modal */}
      <WordPressAuthModal
        isOpen={wpAuthModalOpen}
        onClose={() => setWpAuthModalOpen(false)}
        currentUser={user}
        onWordPressLoginSuccess={handleWordPressLoginSuccess}
        onWordPressLogout={handleWordPressLogout}
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

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <button
              onClick={handleReturnToLanding}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Beranda
            </button>
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
            <button
              onClick={() => setCurrentTab('help')}
              className="hover:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-emerald-400/90 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Panduan & Bantuan</span>
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
