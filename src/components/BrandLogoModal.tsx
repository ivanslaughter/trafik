import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Code2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  BrandLogoConfig,
  DEFAULT_BRAND_LOGO,
  processLogoFile,
  processRawSvgCode,
} from '../utils/logoBranding';
import { BrandMark } from './BrandMark';
import { APP_NAME } from '../config/appConfig';

interface BrandLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandLogo: BrandLogoConfig;
  isLiveConnected: boolean;
  onSaveBrandLogo: (config: BrandLogoConfig) => Promise<{ ok: boolean; message?: string }>;
}

export const BrandLogoModal: React.FC<BrandLogoModalProps> = ({
  isOpen,
  onClose,
  brandLogo,
  isLiveConnected,
  onSaveBrandLogo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<BrandLogoConfig>(brandLogo);
  const [inputMode, setInputMode] = useState<'upload' | 'svg_code'>('upload');
  const [rawSvgCode, setRawSvgCode] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDraft(brandLogo);
      setErrorMsg('');
      setSuccessMsg('');
      setRawSvgCode('');
    }
  }, [isOpen, brandLogo]);

  if (!isOpen) return null;

  const handleFileSelected = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMsg('');
    setSuccessMsg('');

    const result = await processLogoFile(file);
    if (!result.ok || !result.dataUrl || !result.logoType) {
      setErrorMsg(result.error || 'Gagal memproses file logo.');
      return;
    }

    setDraft((prev) => ({
      ...prev,
      logoDataUrl: result.dataUrl!,
      logoType: result.logoType!,
      fileName: result.fileName || file.name,
    }));
  };

  const handleApplyRawSvg = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const result = processRawSvgCode(rawSvgCode, 'custom-inline.svg');
    if (!result.ok || !result.dataUrl) {
      setErrorMsg(result.error || 'Kode SVG tidak valid.');
      return;
    }
    setDraft((prev) => ({
      ...prev,
      logoDataUrl: result.dataUrl!,
      logoType: 'svg',
      fileName: result.fileName || 'custom-inline.svg',
    }));
    setSuccessMsg('SVG berhasil disanitasi & dimuat ke pratinjau!');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    handleFileSelected(droppedFile);
  };

  const handleReset = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setRawSvgCode('');
    setDraft({
      ...DEFAULT_BRAND_LOGO,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSaving(true);
    try {
      const payload: BrandLogoConfig = {
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      const res = await onSaveBrandLogo(payload);
      if (!res.ok) {
        setErrorMsg(res.message || 'Gagal menyimpan logo ke server.');
      } else {
        setSuccessMsg(
          res.message ||
            (isLiveConnected
              ? 'Logo berhasil disimpan ke WordPress Bridge & aktif untuk seluruh pengunjung!'
              : 'Logo berhasil diterapkan di portal!')
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup pengaturan logo"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="pb-4 border-b border-slate-800 pr-10">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>BRANDING KHUSUS ADMINISTRATOR</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Upload Logo Portal (SVG / PNG / WebP)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Unggah file <code className="text-emerald-300">.svg</code> vektor, <code className="text-slate-300">.png</code>, atau <code className="text-slate-300">.webp</code> transparan. Setiap file SVG otomatis disanitasi bebas skrip XSS sebelum disimpan.
          </p>
        </div>

        {/* Live Dark Navbar Preview */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="font-medium text-slate-300">Pratinjau Real-Time di Header Gelap</span>
            {draft.logoType && (
              <span className="font-mono text-emerald-400 uppercase">
                {draft.logoType} {draft.fileName ? `· ${draft.fileName}` : ''}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 h-16 flex items-center justify-between">
            <BrandMark brandLogo={draft} size="header" />
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
              <span>Dasbor</span>
              <span>Selancar Trafik</span>
              <span>Website Saya</span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
              Aktif
            </span>
          </div>
        </div>

        {/* Mode Switcher: File Upload vs Paste Raw SVG */}
        <div className="mt-4 flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              inputMode === 'upload'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (.SVG / .PNG / .WEBP)</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('svg_code')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              inputMode === 'svg_code'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Paste Kode &lt;svg&gt;</span>
          </button>
        </div>

        {/* Upload Dropzone or SVG Code Input */}
        <div className="mt-3">
          {inputMode === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-950/30'
                  : 'border-slate-700 bg-slate-950/60 hover:border-emerald-500/60 hover:bg-slate-950'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml,.png,image/png,.webp,image/webp"
                className="hidden"
                onChange={(e) => {
                  handleFileSelected(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-emerald-400 mb-2">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                Klik untuk memilih file logo atau seret ke sini
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Mendukung <strong className="text-emerald-400">SVG</strong> (vektor tajam), PNG, dan WebP · Maks 350 KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={4}
                value={rawSvgCode}
                onChange={(e) => setRawSvgCode(e.target.value)}
                placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32">...</svg>'
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleApplyRawSvg}
                disabled={!rawSvgCode.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
              >
                Terapkan Kode SVG ke Pratinjau
              </button>
            </div>
          )}
        </div>

        {/* Display Options */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-200">Tinggi Logo di Header</div>
              <div className="text-[11px] text-slate-400">
                Sesuaikan proporsi logo (22px – 48px)
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min={22}
                max={48}
                step={2}
                value={draft.heightPx}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, heightPx: Number(e.target.value) }))
                }
                className="w-28 accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono text-emerald-400 w-10 text-right tabular-nums">
                {draft.heightPx}px
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={draft.showBrandText}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, showBrandText: e.target.checked }))
                }
                className="rounded border-slate-700 bg-slate-900 accent-emerald-500 cursor-pointer"
              />
              <span>Tampilkan teks "{APP_NAME}" di sebelah logo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={draft.invertForDark}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, invertForDark: e.target.checked }))
                }
                className="rounded border-slate-700 bg-slate-900 accent-emerald-500 cursor-pointer"
              />
              <span>Putihkan logo (Mode Gelap)</span>
            </label>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Sanitasi SVG aktif di klien &amp; WordPress Bridge — tag <code>&lt;script&gt;</code> &amp; atribut berbahaya otomatis dihapus. Favicon browser ikut terupdate.
          </span>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || !draft.logoDataUrl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium cursor-pointer transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-emerald-900/30"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan & Terapkan Logo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
