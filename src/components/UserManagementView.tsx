import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Crown,
  CheckCircle2,
  Ban,
  RotateCcw,
  Sparkles,
  Edit2,
  Download,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  X,
  Globe
} from 'lucide-react';
import { UserProfile } from '../types';
import { APP_NAME } from '../config/appConfig';
import { VwsBottomLine, VwsGridFrame, VwsTableRowDivider } from './VwsSmartLine';

interface UserManagementViewProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onAddUser: (newUser: UserProfile) => void;
  onSwitchUser: (userId: string) => void;
  onOpenWordPressAuth?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  currentUser,
  onUpdateUser,
  onAddUser,
  onSwitchUser,
  onOpenWordPressAuth,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMembership, setFilterMembership] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const [pointAdjustment, setPointAdjustment] = useState<number>(500);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [suspendReasonInput, setSuspendReasonInput] = useState<string>('');
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState<boolean>(false);
  const [userToSuspend, setUserToSuspend] = useState<UserProfile | null>(null);

  // New User Form State
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('Jakarta');
  const [newMembership, setNewMembership] = useState<'gratis' | 'pro_nusantara'>('gratis');
  const [newPoints, setNewPoints] = useState<number>(1000);
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  // Summary Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
  const vipUsers = users.filter((u) => u.membership === 'pro_nusantara').length;

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMembership =
      filterMembership === 'all' || user.membership === filterMembership;

    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesMembership && matchesStatus && matchesRole;
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newUser: UserProfile = {
      id: 'usr_indo_' + Math.random().toString(36).substring(2, 7),
      name: newName,
      email: newEmail,
      role: newRole,
      status: 'active',
      city: newCity,
      points: newPoints,
      membership: newMembership,
      surfRatio: newMembership === 'pro_nusantara' ? 1.0 : 0.7,
      totalHitsGiven: 0,
      totalHitsReceived: 0,
      dailySurfedSeconds: 0,
      dailyTargetSeconds: 1800,
      streakDays: 1,
      referralCode: 'NUSANTARA-' + newName.split(' ')[0].toUpperCase(),
      referredCount: 0,
      referralPointsEarned: 0,
      websiteSlots: newMembership === 'pro_nusantara' ? 20 : 3,
      joinedDate: new Date().toISOString().split('T')[0],
      lastActive: 'Baru mendaftar',
    };

    onAddUser(newUser);
    setIsAddUserModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPoints(1000);
  };

  const handleApplyPointAdjustment = () => {
    if (!selectedUserForEdit) return;

    const newPointsBalance =
      adjustmentType === 'add'
        ? selectedUserForEdit.points + pointAdjustment
        : Math.max(0, selectedUserForEdit.points - pointAdjustment);

    const updated: UserProfile = {
      ...selectedUserForEdit,
      points: newPointsBalance,
    };

    onUpdateUser(updated);
    setSelectedUserForEdit(null);
  };

  const handleToggleMembership = (user: UserProfile) => {
    const isVip = user.membership === 'pro_nusantara';
    const updated: UserProfile = {
      ...user,
      membership: isVip ? 'gratis' : 'pro_nusantara',
      surfRatio: isVip ? 0.7 : 1.0,
      websiteSlots: isVip ? 3 : 20,
    };
    onUpdateUser(updated);
  };

  const handleOpenSuspendModal = (user: UserProfile) => {
    setUserToSuspend(user);
    setSuspendReasonInput(
      'Pelanggaran Anti-Cheat: Terdeteksi skrip bot otomatis atau manipulasi tab.'
    );
    setIsSuspendModalOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (!userToSuspend) return;
    const updated: UserProfile = {
      ...userToSuspend,
      status: 'suspended',
      suspendReason: suspendReasonInput,
    };
    onUpdateUser(updated);
    setIsSuspendModalOpen(false);
    setUserToSuspend(null);
  };

  const handleReactivateUser = (user: UserProfile) => {
    const updated: UserProfile = {
      ...user,
      status: 'active',
      suspendReason: undefined,
    };
    onUpdateUser(updated);
  };

  const exportUsersJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${APP_NAME.toLowerCase()}_users_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="relative pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <VwsBottomLine bleedPx={16} />
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Panel Manajemen Pengguna (Admin Console)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola akun peselancar Indonesia, saldo poin, status keanggotaan VIP, dan penegakan sanksi anti-cheat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenWordPressAuth && (
            <button
              onClick={onOpenWordPressAuth}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-800 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 text-xs font-medium cursor-pointer transition-colors"
              title="Konfigurasi integrasi WordPress velocity.web.id dan Database"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Integrasi WordPress</span>
            </button>
          )}

          <button
            onClick={exportUsersJson}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
            title="Ekspor Data Pengguna (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Total Pengguna</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1 block">
            {totalUsers}
          </span>
          <span className="text-[11px] text-slate-400">Terdaftar di platform</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Pengguna Aktif</span>
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1 block">
            {activeUsers}
          </span>
          <span className="text-[11px] text-slate-400">Status normal</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Anggota Pro VIP</span>
          <span className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1 block">
            {vipUsers}
          </span>
          <span className="text-[11px] text-slate-400">Rasio 100% penuh</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Akun Ditangguhkan</span>
          <span className="text-xl font-bold font-mono tabular-nums text-rose-400 mt-1 block">
            {suspendedUsers}
          </span>
          <span className="text-[11px] text-slate-400">Dibekukan anti-cheat</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, email, atau kota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif Normal</option>
            <option value="suspended">Ditangguhkan / Banned</option>
          </select>

          {/* Membership */}
          <select
            value={filterMembership}
            onChange={(e) => setFilterMembership(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Paket</option>
            <option value="gratis">Gratis (70%)</option>
            <option value="pro_nusantara">Pro VIP (100%)</option>
          </select>

          {/* Role */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Peran</option>
            <option value="user">Member</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="relative bg-slate-900/70 shadow-xl">
        <VwsGridFrame hasBackground overhangPx={16} bleedPx={16} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4 font-semibold">Pengguna</th>
                <th className="py-3 px-3 font-semibold">Peran & Wilayah</th>
                <th className="py-3 px-3 font-semibold">Keanggotaan</th>
                <th className="py-3 px-3 font-semibold text-right">Saldo Poin</th>
                <th className="py-3 px-3 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi Administrator</th>
              </tr>
              <VwsTableRowDivider colSpan={6} />
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada pengguna yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isCurrent = u.id === currentUser.id;
                  const isSuspended = u.status === 'suspended';
                  const isVip = u.membership === 'pro_nusantara';

                  return (
                    <React.Fragment key={u.id}>
                      {idx > 0 && <VwsTableRowDivider colSpan={6} />}
                      <tr
                        className={`hover:bg-slate-800/30 transition-colors ${
                          isCurrent ? 'bg-emerald-950/20' : ''
                        }`}
                      >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-200 shrink-0">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-100 truncate">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & City */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-200 capitalize font-medium">
                          {u.role === 'admin' ? 'Admin Sistem' : 'Member Peselancar'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-600" />
                          <span>{u.city}</span>
                        </div>
                      </td>

                      {/* Membership Tier */}
                      <td className="py-3.5 px-3">
                        {isVip ? (
                          <div className="flex items-center gap-1 text-amber-400 font-semibold">
                            <Crown className="w-3.5 h-3.5" />
                            <span>Pro VIP (100%)</span>
                          </div>
                        ) : (
                          <div className="text-slate-300">Gratis (70%)</div>
                        )}
                        <span className="text-[10px] text-slate-500 block">
                          Slot: {u.websiteSlots} website
                        </span>
                      </td>

                      {/* Points Balance */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono tabular-nums text-emerald-400 font-bold">
                          {u.points.toLocaleString('id-ID')}
                        </span>
                        <span className="text-slate-500 text-[10px] block">
                          Given: {u.totalHitsGiven}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {isSuspended ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/40 cursor-help"
                            title={u.suspendReason || 'Dibekukan karena pelanggaran anti-cheat'}
                          >
                            <Ban className="w-3 h-3 text-rose-400" />
                            Ditangguhkan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Point Adjuster */}
                          <button
                            onClick={() => setSelectedUserForEdit(u)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors cursor-pointer"
                            title="Tambah / Kurangi Poin"
                          >
                            ± Poin
                          </button>

                          {/* Upgrade / Downgrade VIP */}
                          <button
                            onClick={() => handleToggleMembership(u)}
                            className="px-2 py-1 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400 text-[11px] font-medium transition-colors cursor-pointer"
                            title={isVip ? 'Turunkan ke Gratis' : 'Jadikan Pro VIP'}
                          >
                            {isVip ? 'Free' : 'VIP'}
                          </button>

                          {/* Suspend / Unsuspend */}
                          {isSuspended ? (
                            <button
                              onClick={() => handleReactivateUser(u)}
                              className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60 text-[11px] font-medium transition-colors cursor-pointer"
                              title="Buka Pembekuan Akun"
                            >
                              Buka Blokir
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenSuspendModal(u)}
                              className="px-2 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/50 text-[11px] font-medium transition-colors cursor-pointer"
                              title="Bekukan Akun (Anti-Cheat Ban)"
                            >
                              Bekukan
                            </button>
                          )}

                          {/* Switch Account */}
                          {!isCurrent && (
                            <button
                              onClick={() => onSwitchUser(u.id)}
                              className="px-2 py-1 rounded bg-slate-800/60 hover:bg-emerald-600 hover:text-white text-slate-400 text-[11px] transition-colors cursor-pointer"
                              title="Login sebagai user ini (Switch Session)"
                            >
                              Login Sbg
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Adjust User Points */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">
              Penyesuaian Saldo Poin Pengguna
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedUserForEdit.name} ({selectedUserForEdit.email})
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Saldo Saat Ini:</span>
                <span className="font-mono tabular-nums text-emerald-400 font-bold">
                  {selectedUserForEdit.points.toLocaleString('id-ID')} Poin
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('add')}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                    adjustmentType === 'add'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  + Tambah Poin (Kredit)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('deduct')}
                  className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                    adjustmentType === 'deduct'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  - Kurangi Poin (Debit)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Jumlah Poin
                </label>
                <input
                  type="number"
                  min={1}
                  value={pointAdjustment}
                  onChange={(e) => setPointAdjustment(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyPointAdjustment}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Terapkan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suspend User with Anti-Cheat Reason */}
      {isSuspendModalOpen && userToSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-rose-800/60 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <Ban className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">
                Bekukan Akun Pengguna (Anti-Cheat Ban)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Pengguna <strong>{userToSuspend.name}</strong> tidak akan dapat berselancar atau mendapatkan poin trafik sampai sanksi dicabut.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alasan Penangguhan / Pelanggaran Anti-Cheat:
                </label>
                <textarea
                  rows={3}
                  value={suspendReasonInput}
                  onChange={(e) => setSuspendReasonInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuspendModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSuspend}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Konfirmasi Pembekuan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New User */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100">
              Daftarkan Pengguna Baru
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tambah akun pengguna baru secara manual ke database sistem {APP_NAME}.
            </p>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hendra Kusuma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="hendra@domain.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kota Asal
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Peran Akun
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="user">Member Biasa</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipe Keanggotaan
                  </label>
                  <select
                    value={newMembership}
                    onChange={(e) => setNewMembership(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="gratis">Gratis (70% Rasio)</option>
                    <option value="pro_nusantara">Pro VIP (100% Rasio)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Saldo Poin Awal
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Buat Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
