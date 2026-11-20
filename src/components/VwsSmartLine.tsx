import React, { useId } from 'react';

/**
 * Default Velocity smart-line color matching Tailwind's `border-slate-800/80`
 * (slate-800 = #1e293b at 0.80 opacity).
 */
export const VWS_LINE_COLOR = '#1e293b';
export const VWS_LINE_OPACITY = 0.8;

export interface VwsSmartLineProps {
  orientation?: 'vertical' | 'horizontal';
  color?: string;
  opacity?: number;
  offsetStart?: string;
  offsetEnd?: string;
  thickness?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Velocity Web Studio Smart Line (vws-line*)
 * Exact 3-segment fading architectural SVG line from velocity.web.id/services/:
 * - line-start: smooth fade-in gradient from 0.009 -> active opacity
 * - line-middle: razor-sharp crispEdges solid hairline
 * - line-end: smooth fade-out gradient from active opacity -> 0.009
 */
export const VwsSmartLine: React.FC<VwsSmartLineProps> = ({
  orientation = 'vertical',
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
  offsetStart = '28px',
  offsetEnd = '28px',
  thickness = 1,
  className = '',
  style,
}) => {
  const reactId = useId();
  const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const svgId = `vws-line-${safeId}`;
  const isHorizontal = orientation === 'horizontal';
  const gradStartId = `${isHorizontal ? 'h' : 'v'}-grad-start-${safeId}`;
  const gradEndId = `${isHorizontal ? 'h' : 'v'}-grad-end-${safeId}`;

  const cssVars = {
    '--line-opacity': String(opacity),
    '--line-offset-start': offsetStart,
    '--line-offset-end': offsetEnd,
    '--line-color': color,
  } as React.CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{
        ...(isHorizontal ? { height: `${thickness}px` } : { width: `${thickness}px` }),
        ...style,
      }}
    >
      <svg
        id={svgId}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={cssVars}
      >
        <style>{`
          #${svgId} {
            --def-opacity: 0.8;
            --def-color: #1e293b;
            --active-opacity: var(--line-opacity, var(--def-opacity));
            --active-start: var(--line-offset-start, 28px);
            --active-end: var(--line-offset-end, 28px);
            --active-color: var(--line-color, var(--def-color));
          }
          #${svgId} .line-rect {
            shape-rendering: crispEdges;
            vector-effect: non-scaling-stroke;
            ${isHorizontal ? 'height: 100%; y: 0;' : 'width: 100%; x: 0;'}
          }
          #${svgId} .line-start {
            ${isHorizontal ? 'x: 0; width: var(--active-start);' : 'y: 0; height: var(--active-start);'}
            fill: url(#${gradStartId});
          }
          #${svgId} .line-middle {
            ${
              isHorizontal
                ? 'x: var(--active-start); width: calc(100% - (var(--active-start) + var(--active-end)));'
                : 'y: var(--active-start); height: calc(100% - (var(--active-start) + var(--active-end)));'
            }
            fill: var(--active-color);
            fill-opacity: var(--active-opacity);
          }
          #${svgId} .line-end {
            ${
              isHorizontal
                ? 'x: calc(100% - var(--active-end)); width: var(--active-end);'
                : 'y: calc(100% - var(--active-end)); height: var(--active-end);'
            }
            fill: url(#${gradEndId});
          }
          #${gradStartId} .line-start-tip,
          #${gradEndId} .line-end-tip {
            stop-color: var(--active-color);
            stop-opacity: 0.009;
          }
          #${gradStartId} .line-end-tip,
          #${gradEndId} .line-start-tip {
            stop-color: var(--active-color);
            stop-opacity: var(--active-opacity);
          }
        `}</style>
        <defs>
          <linearGradient
            id={gradStartId}
            x1="0%"
            y1="0%"
            x2={isHorizontal ? '100%' : '0%'}
            y2={isHorizontal ? '0%' : '100%'}
          >
            <stop className="line-start-tip" offset="0%" />
            <stop className="line-end-tip" offset="100%" />
          </linearGradient>
          <linearGradient
            id={gradEndId}
            x1="0%"
            y1="0%"
            x2={isHorizontal ? '100%' : '0%'}
            y2={isHorizontal ? '0%' : '100%'}
          >
            <stop className="line-start-tip" offset="0%" />
            <stop className="line-end-tip" offset="100%" />
          </linearGradient>
        </defs>
        <rect className="line-rect line-start" />
        <rect className="line-rect line-middle" />
        <rect className="line-rect line-end" />
      </svg>
    </div>
  );
};

interface VwsColumnDividerProps {
  /** Breakpoint from which vertical column divider is visible (matches grid columns) */
  visibleFrom?: 'always' | 'sm' | 'md' | 'lg';
  color?: string;
  opacity?: number;
  overhangPx?: number;
  side?: 'left' | 'right';
}

/**
 * Architectural vertical vws-line positioned on a column boundary
 * with Velocity's signature crosshair overhang past top & bottom box edges.
 */
export const VwsColumnDivider: React.FC<VwsColumnDividerProps> = ({
  visibleFrom = 'lg',
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
  overhangPx = 20,
  side = 'left',
}) => {
  const responsiveClass =
    visibleFrom === 'always'
      ? 'block'
      : visibleFrom === 'sm'
      ? 'hidden sm:block'
      : visibleFrom === 'md'
      ? 'hidden md:block'
      : 'hidden lg:block';

  const fadeTip = `${Math.max(20, overhangPx + 8)}px`;

  return (
    <VwsSmartLine
      orientation="vertical"
      color={color}
      opacity={opacity}
      offsetStart={fadeTip}
      offsetEnd={fadeTip}
      className={`${responsiveClass} absolute ${side === 'right' ? 'right-0' : 'left-0'} z-10`}
      style={{
        top: `-${overhangPx}px`,
        height: `calc(100% + ${overhangPx * 2}px)`,
      }}
    />
  );
};

interface VwsHorizontalLineProps {
  color?: string;
  opacity?: number;
  bleed?: boolean;
  bleedPx?: number;
  className?: string;
}

/**
 * Architectural horizontal vws-line placed along the TOP side of grid boxes.
 */
export const VwsTopLine: React.FC<VwsHorizontalLineProps> = ({
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
  bleed = true,
  bleedPx = 20,
  className = '',
}) => {
  const fadeTip = bleed ? `${Math.max(24, bleedPx + 10)}px` : '18px';
  return (
    <VwsSmartLine
      orientation="horizontal"
      color={color}
      opacity={opacity}
      offsetStart={fadeTip}
      offsetEnd={fadeTip}
      className={`absolute top-0 z-10 ${className}`}
      style={{
        left: bleed ? `-${bleedPx}px` : '0px',
        right: bleed ? `-${bleedPx}px` : '0px',
      }}
    />
  );
};

/**
 * Architectural horizontal vws-line placed along the BOTTOM side of grid boxes.
 */
export const VwsBottomLine: React.FC<VwsHorizontalLineProps> = ({
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
  bleed = true,
  bleedPx = 20,
  className = '',
}) => {
  const fadeTip = bleed ? `${Math.max(24, bleedPx + 10)}px` : '18px';
  return (
    <VwsSmartLine
      orientation="horizontal"
      color={color}
      opacity={opacity}
      offsetStart={fadeTip}
      offsetEnd={fadeTip}
      className={`absolute bottom-0 z-10 ${className}`}
      style={{
        left: bleed ? `-${bleedPx}px` : '0px',
        right: bleed ? `-${bleedPx}px` : '0px',
      }}
    />
  );
};

export interface VwsGridFrameProps {
  /**
   * Velocity architectural rule:
   * - `hasBackground={false}` (transparent columns): top + bottom horizontal lines only; NO first/last vertical lines.
   * - `hasBackground={true}` (background-filled boxes): top + bottom horizontal lines AND first (left) + last (right) vertical lines.
   */
  hasBackground: boolean;
  color?: string;
  opacity?: number;
  overhangPx?: number;
  bleed?: boolean;
  bleedPx?: number;
}

/**
 * Complete Velocity smart-line frame for grid containers and boxed panels.
 * Always renders both top & bottom fading lines, and adds first & last outer
 * vertical lines strictly when the grid/box has a visible background fill.
 */
export const VwsGridFrame: React.FC<VwsGridFrameProps> = ({
  hasBackground,
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
  overhangPx = 20,
  bleed = true,
  bleedPx = 20,
}) => (
  <>
    <VwsTopLine color={color} opacity={opacity} bleed={bleed} bleedPx={bleedPx} />
    <VwsBottomLine color={color} opacity={opacity} bleed={bleed} bleedPx={bleedPx} />
    {hasBackground && (
      <>
        <VwsColumnDivider
          visibleFrom="always"
          side="left"
          color={color}
          opacity={opacity}
          overhangPx={overhangPx}
        />
        <VwsColumnDivider
          visibleFrom="always"
          side="right"
          color={color}
          opacity={opacity}
          overhangPx={overhangPx}
        />
      </>
    )}
  </>
);

export interface VwsRowDividerProps {
  color?: string;
  opacity?: number;
  offsetStart?: string;
  offsetEnd?: string;
  bleedPx?: number;
  className?: string;
}

/**
 * In-flow horizontal vws-line* for dividing rows inside cards, lists, accordions,
 * headers, and sections with fading tips matching border-slate-800/80.
 *
 * Uses symmetric left/right negative margin (`bleedPx`, default 16px) equal to its
 * fade tip length so the fade-in completes right at the left text edge and the
 * fade-out begins right at the right text edge.
 */
export const VwsRowDivider: React.FC<VwsRowDividerProps> = ({
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
  offsetStart,
  offsetEnd,
  bleedPx = 16,
  className = '',
}) => {
  const resolvedTip = `${Math.max(12, bleedPx > 0 ? bleedPx : 16)}px`;
  return (
    <VwsSmartLine
      orientation="horizontal"
      color={color}
      opacity={opacity}
      offsetStart={offsetStart ?? resolvedTip}
      offsetEnd={offsetEnd ?? resolvedTip}
      className={`w-full ${className}`}
      style={
        bleedPx > 0
          ? {
              marginLeft: `-${bleedPx}px`,
              marginRight: `-${bleedPx}px`,
              width: `calc(100% + ${bleedPx * 2}px)`,
            }
          : undefined
      }
    />
  );
};

export interface VwsTableRowDividerProps {
  colSpan: number;
  color?: string;
  opacity?: number;
}

/**
 * Valid HTML table row divider rendering a full-width horizontal vws-line*
 * between thead/tbody rows.
 */
export const VwsTableRowDivider: React.FC<VwsTableRowDividerProps> = ({
  colSpan,
  color = VWS_LINE_COLOR,
  opacity = VWS_LINE_OPACITY,
}) => (
  <tr aria-hidden="true" className="border-0">
    <td colSpan={colSpan} className="p-0 border-0">
      <VwsSmartLine
        orientation="horizontal"
        color={color}
        opacity={opacity}
        offsetStart="16px"
        offsetEnd="16px"
        className="w-full"
      />
    </td>
  </tr>
);

