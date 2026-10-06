# nginx for pcmi-admin.online

`pcmi-admin.conf` is the proposed `/etc/nginx/sites-available/pcmi-admin`,
the live file plus the server-side fixes from the 2026-09-30 pentest:

| Finding | Change |
|---|---|
| F-01 | `limit_req` on `/api/auth/login` (10/min per IP, burst 5, 429); `X-Real-IP` / `X-Forwarded-For` passed to the API so its own per-IP limit sees real clients |
| F-03 | Content-Security-Policy, enforcing, violations reported to `/api/csp-report` |
| F-08 | `server_tokens off`; `Referrer-Policy`, `Permissions-Policy`; `X-XSS-Protection: 0` |

The file is not installed by any deploy step. To install it on the server:

```bash
sudo cp /etc/nginx/sites-available/pcmi-admin /etc/nginx/sites-available/pcmi-admin.bak-$(date +%Y%m%d-%H%M%S)
sudo cp deploy/nginx/pcmi-admin.conf /etc/nginx/sites-available/pcmi-admin
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://pcmi-admin.online/ | grep -iE "server|content-security|referrer|permissions|x-xss"
```

`nginx -t` fails safely: nothing is reloaded until the config parses.

## CSP

The policy is enforcing. It was checked before switching: the bundle has no
inline scripts, `eval` or third-party connections; the print page's single
inline script is allowed by hash; the print templates in the database load
nothing from elsewhere; the template preview is a sandboxed iframe.

Anything the browser blocks is reported to `/api/csp-report` and logged by the
API, rate-limited to 30 lines a minute:

```bash
grep -a "\[CSP\]" ~/.pm2/logs/backend-out.log | tail
```

If something legitimate is blocked, either widen the directive that the log
line names, or go back to report-only while it is sorted out: rename the
header to `Content-Security-Policy-Report-Only`, then `nginx -t` and reload.

A print template that loads an image from another site is fine (`img-src
https:`); one that loads a stylesheet, font or script from another site is
blocked until that host is added to the policy.

If the print page's inline script in
`backend/src/pdf-templates/template-renderer.ts` changes, recompute its hash:

```bash
printf "%s" "<script body>" | openssl dgst -sha256 -binary | openssl base64
```
