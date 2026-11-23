import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ANTICHEAT_SVG_URL = '/assets/aistudio/Paste_November_23__2026_-_12_06AM_e09d1a12';

/**
 * Expanded clip-path for #u4df37fe841-clip-path-1:
 * Preserves the exact rectangular browser-overlap occlusion on the left
 * (x <= 852.271, y in [372.237, 1054.8]), while opening full clearance on top (y = 0),
 * right (x = 1560), and bottom (y = 1408) so shield levitation, shockwave rings,
 * and emerald aura glow never get clipped.
 */
const EXPANDED_SHIELD_CLIP_PATH =
  'M460 372.237 L852.271 372.237 L852.271 1054.8 L460 1054.8 L460 1408 L1560 1408 L1560 0 L460 0 Z';

/** Exact outer contour of the 3D shield for the expanding defensive shockwave ring. */
const SHIELD_OUTER_SILHOUETTE =
  'M945.54 189.965 L960.03 180.044 L974.52 189.965 C1011.486 215.273 1063.875 239.653 1117.354 259.187 C1171.324 278.899 1226.709 293.812 1269.715 300.281 L1291.549 303.565 L1291.549 814.449 C1293.464 910.881 1244.574 997.634 1177.857 1069.004 C1113.882 1137.442 1034.183 1190.995 971.971 1223.721 L960.03 1230.002 L948.089 1223.721 C885.877 1190.995 806.178 1137.442 742.203 1069.004 C675.486 997.634 626.596 910.881 628.511 814.449 L628.511 303.565 L650.345 300.281 C693.351 293.812 748.736 278.899 802.706 259.187 C856.185 239.653 908.575 215.273 945.54 189.965 Z';

/** Exact dual-wing crest centerlines flowing from top apex down both flanks to bottom point. */
const SHIELD_CREST_WINGS = [
  'M960.03 211.13 C1037.679 264.292 1176.488 312.196 1265.899 325.645 C1265.899 435.714 1265.899 708.091 1265.899 814.71 C1269.633 993.818 1079.715 1138.24 960.37 1201.02',
  'M960.03 211.13 C882.381 264.292 743.572 312.196 654.161 325.645 C654.161 435.714 654.161 708.091 654.161 814.71 C650.427 993.818 840.345 1138.24 959.69 1201.02',
];

/**
 * Exact centerlines corresponding to the 3 curved connector shapes in #u4df37fe841-Lines_1,
 * running from the outer green padlock nodes inward to the 3 browser target dots.
 */
const LINES_1_SIGNAL_CURVES: Array<{ d: string; dur: string; delay: string }> = [
  {
    // Right padlock (1627.7, 470.7) -> Browser center-right dot (1067.08, 712.89)
    d: 'M1627.716 470.696 C1590.336 483.945 1573.186 502.118 1556.506 524.127 C1539.826 546.136 1523.616 571.98 1488.12 600.57 C1436.84 641.872 1351.479 625.254 1264.232 647.044 C1183.798 667.134 1118.726 712.89 1067.08 712.89',
    dur: '3.1s',
    delay: '0s',
  },
  {
    // Top-right padlock (1394.04, 224.888) -> Browser lower-center dot (781.942, 920.439)
    d: 'M1394.04 224.888 C1172.036 238.319 1070.02 354.243 998.0 495.793 C925.981 637.34 883.958 804.514 781.942 920.439',
    dur: '3.6s',
    delay: '-1.15s',
  },
  {
    // Bottom-left padlock (348.54, 948.03) -> Browser left dot (618.511, 668.646)
    d: 'M348.54 948.03 C347.641 771.862 553.752 734.712 618.511 668.646',
    dur: '2.9s',
    delay: '-2.05s',
  },
];

export const AntiCheatAnimatedSvg: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const mountSvg = async () => {
      try {
        const res = await fetch(ANTICHEAT_SVG_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rawText = await res.text();
        if (cancelled || !stageRef.current) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(rawText, 'image/svg+xml');
        const parsedSvg = doc.querySelector('svg');
        if (!parsedSvg) throw new Error('Invalid SVG document');

        // Strip any scripts defensively
        parsedSvg.querySelectorAll('script').forEach((node) => node.remove());

        // Make SVG responsive inside the 4:3 card stage
        parsedSvg.removeAttribute('width');
        parsedSvg.removeAttribute('height');
        parsedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        parsedSvg.setAttribute('role', 'img');
        parsedSvg.setAttribute(
          'aria-label',
          'Ilustrasi perisai keamanan browser dan verifikasi interaksi pengguna'
        );

        // Keep static backdrop rect hidden so it blends with the card surface
        const bgLayer = parsedSvg.querySelector('#u4df37fe841-Layer_3');
        if (bgLayer) {
          bgLayer.setAttribute('display', 'none');
        }

        // Expand top/outer boundary of #u4df37fe841-clip-path-1 so shield peak, glow & shockwaves never clip
        const clipPath1 = parsedSvg.querySelector('#u4df37fe841-clip-path-1 path');
        if (clipPath1) {
          clipPath1.setAttribute('d', EXPANDED_SHIELD_CLIP_PATH);
        }

        // Inject metallic armor sheen gradient into <defs>
        const defs = parsedSvg.querySelector('defs');
        if (defs) {
          const sheenGrad = doc.createElementNS(SVG_NS, 'linearGradient');
          sheenGrad.setAttribute('id', 'trafik-ac-sheen-grad');
          sheenGrad.setAttribute('x1', '0%');
          sheenGrad.setAttribute('y1', '0%');
          sheenGrad.setAttribute('x2', '100%');
          sheenGrad.setAttribute('y2', '0%');

          const stops: Array<[string, string, string]> = [
            ['0%', '#ffffff', '0'],
            ['36%', '#d1fae5', '0.16'],
            ['50%', '#ffffff', '0.52'],
            ['64%', '#6ec180', '0.2'],
            ['100%', '#ffffff', '0'],
          ];
          stops.forEach(([offset, color, opacity]) => {
            const stop = doc.createElementNS(SVG_NS, 'stop');
            stop.setAttribute('offset', offset);
            stop.setAttribute('stop-color', color);
            stop.setAttribute('stop-opacity', opacity);
            sheenGrad.appendChild(stop);
          });
          defs.appendChild(sheenGrad);
        }

        // 1. Hydrate Shield group + expanding defense shockwave + dual-wing energy trace + glossy sheen
        const shieldGroup = parsedSvg.querySelector<SVGGElement>('#u4df37fe841-Shield');
        if (shieldGroup) {
          shieldGroup.classList.add('trafik-ac-shield');

          // Insert expanding emerald defensive shockwave rings right behind #u4df37fe841-Shield
          // inside the expanded clip-path-1 wrapper so they remain occluded behind the browser on the left
          const shieldClipParent = shieldGroup.parentElement;
          if (shieldClipParent) {
            const waveGroup = doc.createElementNS(SVG_NS, 'g');
            waveGroup.setAttribute('data-name', 'Shield Defense Shockwaves');

            [0, 1].forEach((waveIdx) => {
              const wave = doc.createElementNS(SVG_NS, 'path');
              wave.setAttribute('d', SHIELD_OUTER_SILHOUETTE);
              wave.setAttribute(
                'class',
                waveIdx === 0
                  ? 'trafik-ac-shield-wave'
                  : 'trafik-ac-shield-wave trafik-ac-shield-wave--secondary'
              );
              waveGroup.appendChild(wave);
            });

            shieldClipParent.insertBefore(waveGroup, shieldGroup);
          }

          // Add clipped energy crest trace + diagonal metallic sheen on the shield armor frame
          const shieldFxClip = doc.createElementNS(SVG_NS, 'g');
          shieldFxClip.setAttribute('clip-path', 'url(#u4df37fe841-clip-path-2)');
          shieldFxClip.setAttribute('data-name', 'Shield Armor Energy FX');

          // Dual-wing glowing perimeter pulse sweeping from apex down both flanks
          SHIELD_CREST_WINGS.forEach((wingD) => {
            const wingPulse = doc.createElementNS(SVG_NS, 'path');
            wingPulse.setAttribute('d', wingD);
            wingPulse.setAttribute('pathLength', '100');
            wingPulse.setAttribute('class', 'trafik-ac-shield-energy-wing');
            shieldFxClip.appendChild(wingPulse);
          });

          // Angled metallic light sheen sweeping diagonally across the shield body
          const sheenWrapper = doc.createElementNS(SVG_NS, 'g');
          sheenWrapper.setAttribute('class', 'trafik-ac-shield-sheen');
          const sheenBar = doc.createElementNS(SVG_NS, 'rect');
          sheenBar.setAttribute('x', '520');
          sheenBar.setAttribute('y', '40');
          sheenBar.setAttribute('width', '260');
          sheenBar.setAttribute('height', '1340');
          sheenBar.setAttribute('fill', 'url(#trafik-ac-sheen-grad)');
          sheenWrapper.appendChild(sheenBar);
          shieldFxClip.appendChild(sheenWrapper);

          shieldGroup.appendChild(shieldFxClip);
        }

        // 2. Hydrate Checked layer (3D white & emerald checkmark)
        const checkedGroup = parsedSvg.querySelector<SVGGElement>('#u4df37fe841-checked');
        if (checkedGroup) {
          checkedGroup.classList.add('trafik-ac-checked');
        }

        // 3. Hydrate Lines 1 (3 curved connectors + endpoint dots + flowing verification pulses)
        const lines1Group = parsedSvg.querySelector<SVGGElement>('#u4df37fe841-Lines_1');
        if (lines1Group) {
          const connectorGroups = Array.from(lines1Group.children).filter(
            (el): el is SVGGElement => el.tagName.toLowerCase() === 'g'
          );

          connectorGroups.forEach((group, idx) => {
            const cfg = LINES_1_SIGNAL_CURVES[idx];
            const paths = group.querySelectorAll<SVGPathElement>('path');
            if (paths[0]) {
              paths[0].classList.add('trafik-ac-line1-track');
              if (cfg) {
                paths[0].style.setProperty('--l1-dur', cfg.dur);
                paths[0].style.setProperty('--l1-delay', cfg.delay);
              }
            }
            if (paths[1]) {
              paths[1].classList.add('trafik-ac-line1-dot');
              if (cfg) {
                paths[1].style.setProperty('--l1-dur', cfg.dur);
                paths[1].style.setProperty('--l1-delay', cfg.delay);
              }
            }
          });

          // Overlay travelling emerald signal packets along the exact 3 curved tracks
          const signalOverlay = doc.createElementNS(SVG_NS, 'g');
          signalOverlay.setAttribute('data-name', 'Lines 1 Signal Pulses');
          LINES_1_SIGNAL_CURVES.forEach((cfg) => {
            const pulse = doc.createElementNS(SVG_NS, 'path');
            pulse.setAttribute('d', cfg.d);
            pulse.setAttribute('pathLength', '100');
            pulse.setAttribute('class', 'trafik-ac-line1-pulse');
            pulse.style.setProperty('--l1-dur', cfg.dur);
            pulse.style.setProperty('--l1-delay', cfg.delay);
            signalOverlay.appendChild(pulse);
          });
          lines1Group.appendChild(signalOverlay);
        }

        // 4. Hydrate Lines 2 (18 outer security mesh lines with staggered breathing & scan pulses)
        const lines2Group = parsedSvg.querySelector<SVGGElement>('#u4df37fe841-Lines_2');
        if (lines2Group) {
          const baseLines = Array.from(lines2Group.querySelectorAll<SVGLineElement>('line'));
          const scanOverlay = doc.createElementNS(SVG_NS, 'g');
          scanOverlay.setAttribute('data-name', 'Lines 2 Scan Pulses');

          baseLines.forEach((line, idx) => {
            // Deterministic varied timings for organic security network activity
            const breathDur = (3.4 + ((idx * 7) % 11) * 0.28).toFixed(2);
            const scanDur = (3.6 + ((idx * 5) % 9) * 0.34).toFixed(2);
            const delay = (-((idx * 0.67) % 5.4)).toFixed(2);

            line.classList.add('trafik-ac-line2-base');
            line.style.setProperty('--l2-dur', `${breathDur}s`);
            line.style.setProperty('--l2-delay', `${delay}s`);

            const scanLine = doc.createElementNS(SVG_NS, 'line');
            scanLine.setAttribute('x1', line.getAttribute('x1') ?? '0');
            scanLine.setAttribute('y1', line.getAttribute('y1') ?? '0');
            scanLine.setAttribute('x2', line.getAttribute('x2') ?? '0');
            scanLine.setAttribute('y2', line.getAttribute('y2') ?? '0');
            scanLine.setAttribute('pathLength', '100');
            scanLine.setAttribute(
              'class',
              idx % 2 === 0
                ? 'trafik-ac-line2-scan'
                : 'trafik-ac-line2-scan trafik-ac-line2-scan--reverse'
            );
            scanLine.style.setProperty('--l2-scan-dur', `${scanDur}s`);
            scanLine.style.setProperty('--l2-delay', `${delay}s`);
            scanOverlay.appendChild(scanLine);
          });

          lines2Group.appendChild(scanOverlay);
        }

        const importedSvg = document.importNode(parsedSvg, true);
        const container = stageRef.current;
        container.innerHTML = '';
        container.appendChild(importedSvg);
      } catch {
        if (!cancelled) {
          setHasError(true);
        }
      }
    };

    mountSvg();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <ShieldCheck className="w-10 h-10 text-emerald-400" />
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      className="trafik-anticheat-svg-stage w-full h-full flex items-center justify-center p-2"
    />
  );
};
