import { AuditEvaluation, ComplianceViolationCategory } from '../types';

// Normalized dictionary for Indonesian Judi Online (Online Gambling / Slot Gacor)
const JUDI_ONLINE_KEYWORDS = [
  'slot',
  'gacor',
  'maxwin',
  'zeus',
  'pragmatic',
  'mahjong',
  'depo',
  'deposit pulsa',
  'wd',
  'withdraw',
  'togel',
  'toto macau',
  'judi bola',
  'sbobet',
  'poker',
  'dominoqq',
  'bandarqq',
  'ceme',
  'jackpot slot',
  'rtp slot',
  'link gacor',
  'agen judi',
  'taruhan',
  'live casino',
  'roulette',
  'baccarat',
  'scatter hitam',
  'kakek zeus',
  'sensational',
  'olympus',
  'spadegaming',
  'habanero',
  'pgsoft',
  'judi',
  'judi online',
  'judol',
  'judislot',
  'bandar togel',
  'agen slot',
  'situs slot',
  'slot gacor',
  'slot88',
  'slot77',
  'slot138',
  'slot pragmatic',
  'kasino online',
];

// Normalized dictionary for 18+ Adult / Pornographic Content
const ADULT_18_PLUS_KEYWORDS = [
  'bokep',
  'porn',
  'xxx',
  'dewasa 18+',
  '18+',
  'lendir',
  'jav',
  'onlyfans',
  'sex',
  'hentai',
  'camfrog',
  'open bo',
  'vcs',
  'pornhub',
  'xhamster',
  'bugil',
  'mesum',
  'desah',
  'colmek',
  'crot',
  'sange',
  'ngentot',
  'becekan',
  'stw hot',
  'tante girang',
  'video bokep',
  'abg mesum',
  'cerita dewasa',
  'foto bugil',
  'telanjang',
  'dildo',
  'masturbasi',
  'porno',
  'pornografi',
  'fetish',
  'bbw hot',
  'leaked onlyfans',
];

/**
 * Normalizes text to defeat leetspeak and deliberate obfuscations (e.g. "sl0t", "g4c0r", "b-o-k-e-p")
 */
function normalizeObfuscatedText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[\-_.\s]+/g, ' '); // collapse hyphens, underscores, dots, multiple spaces
}

export function auditWebsiteCompliance(
  url: string,
  title: string,
  description: string = ''
): AuditEvaluation {
  const combinedRaw = `${url} ${title} ${description}`.toLowerCase();
  const normalized = normalizeObfuscatedText(combinedRaw);

  const detectedKeywords: string[] = [];
  const violations: ComplianceViolationCategory[] = [];
  let riskScore = 0;

  // 1. Audit for Judi Online (Online Gambling)
  for (const kw of JUDI_ONLINE_KEYWORDS) {
    const kwNorm = normalizeObfuscatedText(kw);
    // Check both exact boundary or substring in URL/text
    const pattern = new RegExp(`\\b${kwNorm}\\b`, 'i');
    if (pattern.test(normalized) || combinedRaw.includes(kw) || url.toLowerCase().includes(kw)) {
      if (!detectedKeywords.includes(kw)) {
        detectedKeywords.push(kw);
      }
      if (!violations.includes('JUDI_ONLINE')) {
        violations.push('JUDI_ONLINE');
      }
      riskScore += 35;
    }
  }

  // 2. Audit for 18+ Adult / Pornographic Content
  for (const kw of ADULT_18_PLUS_KEYWORDS) {
    const kwNorm = normalizeObfuscatedText(kw);
    const pattern = new RegExp(`\\b${kwNorm}\\b`, 'i');
    if (pattern.test(normalized) || combinedRaw.includes(kw) || url.toLowerCase().includes(kw)) {
      if (!detectedKeywords.includes(kw)) {
        detectedKeywords.push(kw);
      }
      if (!violations.includes('ADULT_18_PLUS')) {
        violations.push('ADULT_18_PLUS');
      }
      riskScore += 45;
    }
  }

  // 3. Heuristic Domain Risk Check (Common patterns in predatory affiliate spam)
  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsedUrl.hostname.toLowerCase();

    // Check for multiple consecutive hyphens or suspicious TLDs often abused for fast disposable slot mirrors
    if (host.includes('slot') || host.includes('gacor') || host.includes('togel') || host.includes('maxwin')) {
      riskScore += 50;
      if (!violations.includes('JUDI_ONLINE')) violations.push('JUDI_ONLINE');
      if (!detectedKeywords.includes(`Domain Host: ${host}`)) detectedKeywords.push(`Host: ${host}`);
    }

    if (host.includes('bokep') || host.includes('porn') || host.includes('xxx')) {
      riskScore += 50;
      if (!violations.includes('ADULT_18_PLUS')) violations.push('ADULT_18_PLUS');
      if (!detectedKeywords.includes(`Domain Host: ${host}`)) detectedKeywords.push(`Host: ${host}`);
    }
  } catch {
    // invalid URL format
  }

  // Cap risk score between 0 and 100
  const finalScore = Math.min(100, riskScore);
  const passed = finalScore < 30 && violations.length === 0;

  let reason = 'Website lolos pemindaian kepatuhan konten Kementerian Komunikasi & Digital (Komdigi / Kominfo).';
  if (!passed) {
    const violationLabels = violations.map((v) => {
      if (v === 'JUDI_ONLINE') return 'Judi Online / Slot Gacor (Melanggar UU ITE No. 1/2024 & Pasal 303 KUHP)';
      if (v === 'ADULT_18_PLUS') return 'Konten Dewasa 18+ / Pornografi (Melanggar UU No. 44/2008)';
      return 'Konten Ilegal / Berbahaya';
    });
    reason = `DITOLAK: Terdeteksi pelanggaran ${violationLabels.join(' & ')}. Kata kunci terdeteksi: ${detectedKeywords.slice(0, 5).join(', ')}.`;
  }

  return {
    passed,
    riskScore: finalScore,
    violations,
    detectedKeywords,
    reason,
    auditTimestamp: new Date().toISOString(),
  };
}
