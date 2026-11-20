import React from 'react';
import { APP_NAME } from '../config/appConfig';
import { BrandLogoConfig } from '../utils/logoBranding';

interface BrandMarkProps {
  brandLogo?: BrandLogoConfig | null;
  size?: 'header' | 'footer';
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  brandLogo,
  size = 'header',
  className = '',
}) => {
  const hasCustomLogo = Boolean(brandLogo?.logoDataUrl);
  const rawHeight = brandLogo?.heightPx || 32;
  const displayHeight = size === 'footer' ? Math.max(18, Math.round(rawHeight * 0.7)) : rawHeight;
  const showText = !hasCustomLogo || brandLogo?.showBrandText !== false;

  return (
    <span className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      {hasCustomLogo && brandLogo?.logoDataUrl && (
        <img
          src={brandLogo.logoDataUrl}
          alt={`Logo ${APP_NAME}`}
          style={{ height: `${displayHeight}px` }}
          className={`w-auto max-w-[180px] object-contain select-none ${
            brandLogo.invertForDark ? 'brightness-0 invert' : ''
          }`}
          decoding="async"
        />
      )}
      {showText && (
        <span
          className={
            size === 'footer'
              ? 'font-semibold text-slate-300'
              : 'text-xl font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors'
          }
        >
          {APP_NAME}
        </span>
      )}
    </span>
  );
};
