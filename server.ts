import express from 'express';
import dns from 'node:dns/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // Link-local / Cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // Multicast / reserved
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) return true;
    if (lower.startsWith('::ffff:')) {
      return isPrivateOrReservedIpv4(lower.replace('::ffff:', ''));
    }
    return false;
  }
  return true;
}

async function resolveAndVerifyPublicHost(hostname: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { ok: false, error: `Domain "${hostname}" tidak memiliki catatan DNS aktif.` };
    }
    for (const rec of records) {
      if (isPrivateOrReservedIp(rec.address)) {
        return {
          ok: false,
          error: `Domain "${hostname}" mengarah ke alamat IP privat/lokal dan tidak diperbolehkan.`,
        };
      }
    }
    return { ok: true };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return {
        ok: false,
        error: `Domain "${hostname}" tidak ditemukan di DNS (NXDOMAIN). Pastikan domain sudah aktif.`,
      };
    }
    return {
      ok: false,
      error: `Gagal menyelesaikan DNS untuk "${hostname}".`,
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '64kb' }));

  // Server-side HTTP HEAD URL verification API (bypasses browser CORS to read exact HTTP 200 OK status)
  app.post('/api/websites/head-check', async (req, res) => {
    const rawUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      res.status(400).json({
        ok200: false,
        reachable: false,
        statusCode: 0,
        statusText: 'Bad Request',
        method: 'HEAD',
        message: 'URL harus diawali dengan http:// atau https://.',
      });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({
        ok200: false,
        reachable: false,
        statusCode: 0,
        statusText: 'Invalid URL',
        method: 'HEAD',
        message: 'Format URL tidak valid.',
      });
      return;
    }

    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (
      !hostname ||
      hostname === 'localhost' ||
      net.isIP(hostname) !== 0 ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      res.status(400).json({
        ok200: false,
        reachable: false,
        statusCode: 0,
        statusText: 'Forbidden Host',
        method: 'HEAD',
        message: 'Domain lokal atau alamat IP langsung tidak diperbolehkan.',
      });
      return;
    }

    const dnsCheck = await resolveAndVerifyPublicHost(hostname);
    if (!dnsCheck.ok) {
      res.status(200).json({
        ok200: false,
        reachable: false,
        statusCode: 0,
        statusText: 'DNS Error',
        method: 'HEAD',
        message: dnsCheck.error,
      });
      return;
    }

    const controller = new AbortController();
    const timeoutMs = 8000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();

    try {
      const headers = {
        'User-Agent': 'TrafikIndonesia-URLValidator/1.0 (+https://trafik.velocity.web.id)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      };

      let usedMethod: 'HEAD' | 'HEAD->GET' = 'HEAD';
      let response = await fetch(parsed.href, {
        method: 'HEAD',
        redirect: 'follow',
        headers,
        signal: controller.signal,
      });

      // Some servers/CDNs reject HEAD with 405 Method Not Allowed or 501 Not Implemented
      if (response.status === 405 || response.status === 501) {
        usedMethod = 'HEAD->GET';
        response = await fetch(parsed.href, {
          method: 'GET',
          redirect: 'follow',
          headers,
          signal: controller.signal,
        });
        // Cancel body stream immediately so we don't download full page payload
        if (response.body) {
          await response.body.cancel().catch(() => {});
        }
      }

      const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
      const statusCode = response.status;
      const statusText = response.statusText || (statusCode === 200 ? 'OK' : '');
      const ok200 = statusCode === 200;

      res.status(200).json({
        ok200,
        reachable: true,
        statusCode,
        statusText,
        method: usedMethod,
        latencyMs,
        finalUrl: response.url || parsed.href,
        message: ok200
          ? `Server merespons HTTP 200 OK via ${usedMethod} (${latencyMs} ms).`
          : `Server merespons HTTP ${statusCode}${statusText ? ` ${statusText}` : ''} — hanya domain dengan status 200 OK yang dapat didaftarkan.`,
      });
    } catch (err: unknown) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      res.status(200).json({
        ok200: false,
        reachable: false,
        statusCode: 0,
        statusText: isTimeout ? 'Timeout' : 'Network Error',
        method: 'HEAD',
        message: isTimeout
          ? `Permintaan HEAD ke "${hostname}" melebihi batas waktu (${timeoutMs / 1000} detik).`
          : `Gagal menghubungi "${hostname}" melalui permintaan HEAD. Pastikan server aktif dan SSL valid.`,
      });
    } finally {
      clearTimeout(timer);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trafik dev/API server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
