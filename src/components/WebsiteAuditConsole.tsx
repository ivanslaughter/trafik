import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Flame,
  Ban,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpRight,
  Eye,
  FileText,
  Scan
} from 'lucide-react';
import { WebsiteCampaign, WebsiteAuditStatus } from '../types';
import { auditWebsiteCompliance } from '../services/complianceAuditEngine';

interface WebsiteAuditConsoleProps {
  websites: WebsiteCampaign[];
  onApproveWebsite: (siteId: string) => void;
  onRejectWebsite: (siteId: string, reason: string) => void;
  onQuarantineWebsite: (siteId: string, reason: string) => void;
}

export const WebsiteAuditConsole: React.FC<WebsiteAuditConsoleProps> = ({
  websites,
  onApproveWebsite,
  onRejectWebsite,
  onQuarantineWebsite,
}) => {
  const [filterAudit, setFilterAudit] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Live URL Scanner Tool State
  const [testUrl, setTestUrl] = useState<string>('https://slot-gacor-zeus-maxwin.xyz');
  const [testTitle, setTestTitle] = useState<string>('Daftar Akun Slot Gacor Terpercaya Deposit Pulsa Tanpa Potongan');
  const [testResult, setTestResult] = useState<ReturnType<typeof auditWebsiteCompliance> | null>(null);

  // Selected website for audit detail modal
  const [selectedSiteDetail, setSelectedSiteDetail] = useState<WebsiteCampaign | null>(null);

  // KPI counts
  const totalAudited = websites.length;
  const approvedCount = websites.filter((w) => w.auditStatus === 'approved').length;
  const flaggedCount = websites.filter((w) => w.auditStatus === 'flagged').length;
  const rejectedCount = websites.filter((w) => w.auditStatus === 'rejected').length;
  const pendingCount = websites.filter((w) => w.auditStatus === 'pending').length;

  const filteredWebsites = websites.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterAudit === 'all' || w.auditStatus === filterAudit;

    return matchesSearch && matchesFilter;
  });

  const handleRunTestScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUrl.trim()) return;
    const result = auditWebsiteCompliance(testUrl, testTitle);
    setTestResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Audit Kepatuhan Website & Pencegahan Judi Online / 18+
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Sistem pemindai heuristik dan kecerdasan regulasi untuk memblokir konten terlarang (Judi Slot, Kasino, Togel, dan Pornografi 18+) sesuai UU ITE No. 1/2024 dan UU Pornografi No. 44/2008.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-xs font-mono text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Filter Anti-Judol & 18+ Aktif
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Total Situs Terdaftar</span>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-100 mt-1 block">
            {totalAudited}
          </span>
          <span className="text-[11px] text-slate-400">Dalam database</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Lolos & Bersih</span>
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1 block">
            {approvedCount}
          </span>
          <span className="text-[11px] text-slate-400">Aktif di rotasi</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Menunggu Review</span>
          <span className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1 block">
            {pendingCount}
          </span>
          <span className="text-[11px] text-slate-400">Butuh verifikasi</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Ditandai / Karantina</span>
          <span className="text-xl font-bold font-mono tabular-nums text-purple-400 mt-1 block">
            {flaggedCount}
          </span>
          <span className="text-[11px] text-slate-400">Laporan peselancar</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/70">
          <span className="text-[11px] text-slate-500 block">Ditolak / Diblokir</span>
          <span className="text-xl font-bold font-mono tabular-nums text-rose-400 mt-1 block">
            {rejectedCount}
          </span>
          <span className="text-[11px] text-slate-400">Judi slot / 18+</span>
        </div>
      </div>

      {/* Interactive Compliance URL Scanner Tool */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
          <Scan className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Uji Coba Langsung: Pemindai Kepatuhan URL (Compliance URL Scanner)
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Masukkan URL atau judul website apapun untuk menguji bagaimana sistem mendeteksi kata kunci terselubung, leetspeak (misal: <em>sl0t</em>, <em>g4c0r</em>, <em>b0k3p</em>), atau domain berisiko tinggi.
        </p>

        <form onSubmit={handleRunTestScan} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                URL Website yang Diuji
              </label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                placeholder="https://domain-target.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Judul / Deskripsi Website
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                placeholder="Judul halaman web..."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span>Preset Cepat:</span>
              <button
                type="button"
                onClick={() => {
                  setTestUrl('https://slot77-gacor-pragmatic.xyz/login');
                  setTestTitle('Situs Slot Gacor Maxwin Zeus RTP Tertinggi Hari Ini');
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Uji Judi Slot
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestUrl('https://koleksibokep-terbaru-18hot.com');
                  setTestTitle('Nonton Video Dewasa 18+ Streaming Full HD');
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Uji Konten 18+
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestUrl('https://tokoherbalnusantara.com/madu-asli');
                  setTestTitle('Jual Madu Hutan Asli Sumbawa Kualitas Ekspor');
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Uji Situs Bersih (UMKM)
              </button>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Jalankan Pemindaian AI & Kata Kunci</span>
            </button>
          </div>
        </form>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-xl border transition-all ${
              testResult.passed
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : 'border-rose-500/50 bg-rose-950/20'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                {testResult.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    Hasil Pemindaian: {testResult.passed ? 'LOLOS (KONTEN BERSIH)' : 'DITOLAK (MELANGGAR REGULASI)'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Waktu Audit: {new Date(testResult.auditTimestamp).toLocaleTimeString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Skor Risiko:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                    testResult.passed
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {testResult.riskScore} / 100
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
              {testResult.reason}
            </p>

            {testResult.detectedKeywords.length > 0 && (
              <div className="mt-3 pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px]">Kata Kunci Teridentifikasi:</span>
                {testResult.detectedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-mono text-[11px]"
                  >
                    "{kw}"
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Moderation Queue & Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari website dalam antrean audit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: `Semua (${websites.length})` },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'flagged', label: `Karantina (${flaggedCount})` },
            { id: 'rejected', label: `Ditolak (${rejectedCount})` },
            { id: 'approved', label: `Bersih (${approvedCount})` },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterAudit(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterAudit === f.id
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Websites Moderation Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4 font-semibold">Website & URL</th>
                <th className="py-3 px-3 font-semibold">Kategori</th>
                <th className="py-3 px-3 font-semibold text-center">Status Audit</th>
                <th className="py-3 px-3 font-semibold text-center">Skor Risiko</th>
                <th className="py-3 px-3 font-semibold">Catatan Kepatuhan</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi Moderator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredWebsites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Tidak ada website yang sesuai dengan filter audit.
                  </td>
                </tr>
              ) : (
                filteredWebsites.map((site) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      Lolos / Bersih
                    </span>
                  );

                  if (site.auditStatus === 'rejected') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800/40">
                        Ditolak (Judi/18+)
                      </span>
                    );
                  } else if (site.auditStatus === 'flagged') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/40">
                        Karantina ({site.reportedCount} Laporan)
                      </span>
                    );
                  } else if (site.auditStatus === 'pending') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        Menunggu Review
                      </span>
                    );
                  }

                  return (
                    <tr key={site.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Title & URL */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-100 truncate">{site.title}</div>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-slate-400 hover:text-emerald-400 truncate text-[11px] flex items-center gap-1 mt-0.5"
                        >
                          <span>{site.url.replace('https://', '')}</span>
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                        </a>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 uppercase font-mono text-[11px] text-slate-400">
                        {site.category}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">{statusBadge}</td>

                      {/* Risk Score */}
                      <td className="py-3.5 px-3 text-center font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            site.auditScore > 40
                              ? 'text-rose-400'
                              : site.auditScore > 0
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {site.auditScore}%
                        </span>
                      </td>

                      {/* Audit Notes */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <p className="text-[11px] text-slate-300 truncate" title={site.auditNotes}>
                          {site.auditNotes || 'Belum ada catatan khusus.'}
                        </p>
                        {site.detectedKeywords && site.detectedKeywords.length > 0 && (
                          <div className="text-[10px] text-rose-400 font-mono mt-0.5 truncate">
                            Triggers: {site.detectedKeywords.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Moderator Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve Action */}
                          {site.auditStatus !== 'approved' && (
                            <button
                              onClick={() => onApproveWebsite(site.id)}
                              className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60 text-[11px] font-medium transition-colors cursor-pointer"
                              title="Setujui dan masukkan ke antrean selancar aktif"
                            >
                              Setujui
                            </button>
                          )}

                          {/* Reject / Block Action */}
                          {site.auditStatus !== 'rejected' && (
                            <button
                              onClick={() =>
                                onRejectWebsite(
                                  site.id,
                                  'Ditolak Moderator: Terindikasi pelanggaran konten judi online / 18+.'
                                )
                              }
                              className="px-2.5 py-1 rounded bg-rose-950/50 text-rose-300 border border-rose-800/40 hover:bg-rose-900/60 text-[11px] font-medium transition-colors cursor-pointer"
                              title="Tolak dan blokir situs ini"
                            >
                              Blokir
                            </button>
                          )}

                          {/* Quarantine Action */}
                          {site.auditStatus === 'approved' && (
                            <button
                              onClick={() =>
                                onQuarantineWebsite(
                                  site.id,
                                  'Diisolasi untuk investigasi kepatuhan lebih lanjut.'
                                )
                              }
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors cursor-pointer"
                              title="Karantina situs"
                            >
                              Karantina
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
