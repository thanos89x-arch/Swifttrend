# SwiftTrend AI — Post-Deploy Validation Checklist

Replace `{{DOMAIN}}` with your production domain before running commands.

---

## 1. Security Headers

```bash
# Verify all critical headers are present
curl -sI https://{{DOMAIN}}/ | grep -E \
  "cache-control|x-content-type|x-frame|referrer-policy|permissions-policy|strict-transport|content-security|cross-origin"

# Expected output must include:
# cache-control: no-cache, no-store, must-revalidate
# x-content-type-options: nosniff
# x-frame-options: DENY
# strict-transport-security: max-age=63072000; includeSubDomains; preload
# content-security-policy: <non-empty>

# Verify assets are immutable
curl -sI https://{{DOMAIN}}/assets/index-$(ls dist/assets/index-*.js | head -1 | xargs basename) \
  | grep cache-control
# Expected: cache-control: public, max-age=31536000, immutable
```

---

## 2. Edge Proxy — Connectivity

```bash
# Anthropic proxy health (expect 400/401, NOT 502/504)
curl -sv https://{{DOMAIN}}/api/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' \
  2>&1 | grep -E "^< HTTP|error"

# Market data proxy (Twelve Data ping — no key needed for /api_usage)
curl -s "https://{{DOMAIN}}/api/market/api_usage" | jq .

# FTMO proxy (expect non-502)
curl -sv https://{{DOMAIN}}/api/ftmo/health 2>&1 | grep "^< HTTP"
```

---

## 3. CORS Preflight

```bash
curl -sv https://{{DOMAIN}}/api/anthropic/v1/messages \
  -X OPTIONS \
  -H "Origin: https://{{DOMAIN}}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-api-key" \
  2>&1 | grep -E "^< (HTTP|access-control|allow)"

# Expected:
# < HTTP/2 204
# < access-control-allow-origin: https://{{DOMAIN}}
# < access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## 4. SPA Routing

```bash
# All routes must return 200 + index.html (not 404)
for ROUTE in "/" "/performance" "/ftmo" "/market-ai" "/news" "/macro" "/config" "/consigli"; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" "https://{{DOMAIN}}${ROUTE}")
  echo "$STATUS  $ROUTE"
done
# Expected: all 200
```

---

## 5. Lighthouse CLI Audit

```bash
npx lighthouse https://{{DOMAIN}} \
  --only-categories=performance,best-practices,seo \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless" \
  | tail -5

# Open HTML report:
npx lighthouse https://{{DOMAIN}} \
  --output=html \
  --output-path=./lighthouse-report.html \
  --chrome-flags="--headless"
open ./lighthouse-report.html

# Target scores:
# Performance:     ≥ 85
# Best Practices:  ≥ 95
# SEO:             ≥ 90
```

---

## 6. TanStack Query Cache Audit (browser DevTools)

Open the app in browser → DevTools Console → paste:

```javascript
// List all active queries and their stale status
const client = window.__REACT_QUERY_CLIENT__; // only works with ReactQueryDevtools
// Or inject manually in providers.tsx: window.__REACT_QUERY_CLIENT__ = queryClient;

// Check cache entries
client.getQueryCache().getAll().forEach(q => {
  console.table({
    key:       JSON.stringify(q.queryKey),
    state:     q.state.status,
    stale:     q.isStale(),
    dataAge:   q.state.dataUpdatedAt ? Date.now() - q.state.dataUpdatedAt + 'ms' : 'never',
    observers: q.getObserversCount(),
  });
});

// Verify no query has staleTime > expected:
// Prices/Indicators → 10_000ms
// News/Macro        → 300_000ms
// Backend           → 0ms (always stale)
```

---

## 7. Network Tab Checks

Open browser DevTools → Network tab → filter by `XHR/Fetch`:

| Check | Expected |
|---|---|
| `/api/anthropic/*` requests | No `x-api-key` header in client request |
| `/api/market/*` requests | No `apikey` query param in client request |
| `/assets/*.js` response | `cache-control: immutable` |
| `/index.html` response | `cache-control: no-store` |
| CORS error in console | None |
| Mixed content warning | None |

---

## 8. Runtime Error Check

```bash
# Verify no runtime JS errors on first load
npx playwright test --reporter=line << 'EOF'
import { test, expect } from '@playwright/test';
test('no console errors on load', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('https://{{DOMAIN}}/');
  await page.waitForLoadState('networkidle');
  expect(errors).toHaveLength(0);
});
EOF
```

---

## 9. Bundle Size Guard

```bash
# Ensure no bundle regression > 10% from baseline (403 KB)
BUNDLE_SIZE=$(ls -la dist/assets/index-*.js | awk '{print $5}')
echo "Bundle: ${BUNDLE_SIZE} bytes"
# Alert if > 450000 bytes (≈ 450 KB)
[ "$BUNDLE_SIZE" -gt 450000 ] && echo "⚠ Bundle size regression!" || echo "✓ Bundle size OK"
```

---

## 10. DNS + TLS

```bash
# Verify TLS grade
curl -s "https://api.ssllabs.com/api/v3/analyze?host={{DOMAIN}}&publish=off&all=done" \
  | jq '.endpoints[0].grade'
# Expected: "A" or "A+"

# Verify HSTS preload eligibility
curl -sI https://{{DOMAIN}} | grep strict-transport
# Must include: preload
```
