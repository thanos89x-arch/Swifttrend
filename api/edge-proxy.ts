/**
 * SwiftTrend AI — Edge Proxy
 * Compatible with: Vercel Edge Runtime, Cloudflare Workers, Netlify Edge Functions.
 * Routes /api/{anthropic,ftmo,market}/* to upstream services.
 * Secrets are injected from runtime environment — never from client.
 */

// ── Environment interface ─────────────────────────────────────────────

interface ProxyEnv {
  readonly ANTHROPIC_KEY:    string;
  readonly FTMO_API_URL:     string;
  readonly FTMO_API_KEY:     string;
  readonly MARKET_DATA_KEY:  string;
  readonly PRODUCTION_DOMAIN: string;
  readonly BACKEND_URL:      string;   // VPS URL, e.g. http://1.2.3.4:3000
}

// ── Upstream routing table ────────────────────────────────────────────

type UpstreamId = 'anthropic' | 'ftmo' | 'market' | 'backend';

const UPSTREAMS: Record<UpstreamId, string> = {
  anthropic: 'https://api.anthropic.com',
  ftmo:      '{{FTMO_API_URL}}',          // replaced at runtime from env
  market:    'https://api.twelvedata.com',
  backend:   '{{BACKEND_URL}}',           // VPS trading server, replaced at runtime
};

// ── Sensitive headers stripped from client requests ───────────────────

const STRIP_REQUEST_HEADERS: ReadonlySet<string> = new Set([
  'origin',
  'referer',
  'host',
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'x-vercel-id',
  'x-vercel-forwarded-for',
]);

// ── Sensitive headers stripped from upstream responses ────────────────

const STRIP_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-expose-headers',
  'set-cookie',
]);

// ── CORS ──────────────────────────────────────────────────────────────

function corsHeaders(origin: string | null, allowed: string): Record<string, string> {
  const allowedOrigin = origin === allowed || origin === `https://${allowed}` ? (origin ?? '*') : allowed;
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
    'Access-Control-Max-Age':       '86400',
  };
}

// ── Inject per-upstream auth headers ─────────────────────────────────

function injectAuth(
  headers: Headers,
  upstream: UpstreamId,
  env: ProxyEnv,
): void {
  switch (upstream) {
    case 'anthropic':
      headers.set('x-api-key', env.ANTHROPIC_KEY);
      headers.set('anthropic-version', '2023-06-01');
      headers.set('anthropic-dangerous-direct-browser-access', 'true');
      break;
    case 'ftmo':
      headers.set('Authorization', `Bearer ${env.FTMO_API_KEY}`);
      break;
    case 'market':
    case 'backend':
      // No auth injection — backend uses its own auth or is private
      break;
  }
}

// ── Parse upstream from URL path ─────────────────────────────────────

function parseRoute(pathname: string): { upstream: UpstreamId; rest: string } | null {
  const match = pathname.match(/^\/api\/(anthropic|ftmo|market|backend)(\/.*)?$/);
  if (!match) return null;
  return {
    upstream: match[1] as UpstreamId,
    rest:     match[2] ?? '/',
  };
}

// ── process.env available on Vercel Edge Runtime (V8 isolate) ────────
declare const process: { env: Record<string, string | undefined> };

// ── Read env — Vercel Edge exposes vars via process.env ───────────────

function readEnv(): ProxyEnv {
  const e = process.env;
  const get = (key: string): string => e[key] ?? '';
  return {
    ANTHROPIC_KEY:     get('ANTHROPIC_KEY'),
    FTMO_API_URL:      get('FTMO_API_URL'),
    FTMO_API_KEY:      get('FTMO_API_KEY'),
    MARKET_DATA_KEY:   get('MARKET_DATA_KEY'),
    PRODUCTION_DOMAIN: get('PRODUCTION_DOMAIN'),
    BACKEND_URL:       get('BACKEND_URL'),
  };
}

// ── Main handler — Vercel Edge Function format ────────────────────────

export default async function handler(request: Request): Promise<Response> {
    const env    = readEnv();
    const url    = new URL(request.url);
    const origin = request.headers.get('origin');
    const cors   = corsHeaders(origin, env.PRODUCTION_DOMAIN);

    // ── CORS preflight ────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── Debug route — always fires regardless of path ────────────────
    if (url.searchParams.has('__debug')) {
      const headers: Record<string, string> = {};
      request.headers.forEach((v, k) => { headers[k] = v; });
      return new Response(JSON.stringify({
        url: request.url,
        pathname: url.pathname,
        env: {
          BACKEND_URL:       env.BACKEND_URL       || 'MISSING',
          ANTHROPIC_KEY:     env.ANTHROPIC_KEY     ? `set(${env.ANTHROPIC_KEY.length})` : 'MISSING',
          MARKET_DATA_KEY:   env.MARKET_DATA_KEY   ? 'set' : 'MISSING',
          PRODUCTION_DOMAIN: env.PRODUCTION_DOMAIN || 'MISSING',
        },
        headers,
      }, null, 2), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    // ── Route resolution ──────────────────────────────────────────────
    const route = parseRoute(url.pathname);
    if (!route) {
      return new Response(JSON.stringify({ error: 'Unknown proxy route' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    // ── Build upstream URL ────────────────────────────────────────────
    const baseUrl = route.upstream === 'ftmo'
      ? env.FTMO_API_URL
      : route.upstream === 'backend'
        ? env.BACKEND_URL
        : UPSTREAMS[route.upstream];
    if (!baseUrl || baseUrl.startsWith('{{')) {
      return new Response(JSON.stringify({ error: 'Upstream not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const upstreamUrl = new URL(route.rest + url.search, baseUrl);

    // Append Twelve Data apikey as query param (not a header)
    if (route.upstream === 'market' && env.MARKET_DATA_KEY) {
      upstreamUrl.searchParams.set('apikey', env.MARKET_DATA_KEY);
    }

    // ── Build forwarded request headers ───────────────────────────────
    const outHeaders = new Headers();
    for (const [key, value] of request.headers.entries()) {
      if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
        outHeaders.set(key, value);
      }
    }
    outHeaders.set('host', upstreamUrl.hostname);
    injectAuth(outHeaders, route.upstream, env);

    // ── Forward request ───────────────────────────────────────────────
    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method:  request.method,
        headers: outHeaders,
        body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        // @ts-expect-error — duplex is required for streaming body in some runtimes
        duplex: 'half',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upstream unreachable';
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    // ── Build response headers ────────────────────────────────────────
    const respHeaders = new Headers();
    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        respHeaders.set(key, value);
      }
    }
    for (const [key, value] of Object.entries(cors)) {
      respHeaders.set(key, value);
    }

    return new Response(upstreamResponse.body, {
      status:  upstreamResponse.status,
      headers: respHeaders,
    });
}

export const config = { runtime: 'edge' };
