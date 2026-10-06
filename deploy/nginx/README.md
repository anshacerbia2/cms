# nginx for pcmi-admin.online

`pcmi-admin.conf` is the proposed `/etc/nginx/sites-available/pcmi-admin`,
the live file plus the server-side fixes from the 2026-09-30 pentest:

| Finding | Change |
|---|---|
| F-01 | `limit_req` on `/api/auth/login` (10/min per IP, burst 5, 429); `X-Real-IP` / `X-Forwarded-For` passed to the API so its own per-IP limit sees real clients |
| F-03 | Content-Security-Policy, enforcing; violations reported to `/api/csp-report` and logged by the API |
| F-08 | `server_tokens off`; `Referrer-Policy`, `Permissions-Policy`; `X-XSS-Protection: 0` |

The file is not installed by any deploy step. To install it on the server:

```bash
sudo cp /etc/nginx/sites-available/pcmi-admin /etc/nginx/sites-available/pcmi-admin.bak-$(date +%Y%m%d-%H%M%S)
sudo cp deploy/nginx/pcmi-admin.conf /etc/nginx/sites-available/pcmi-admin
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://pcmi-admin.online/ | grep -iE "server|content-security|referrer|permissions|x-xss"
```

`nginx -t` fails safely: nothing is reloaded until the config parses.

## CSP rollout

The file ships with the **enforcing** `Content-Security-Policy` (since
2026-10-05). The Report-Only period was replaced by a check of everything the
policy governs:

- the built frontend (`/var/www/cms`): one external module script, no inline
  scripts or event handlers, no `eval`/`new Function`, no workers, WebSockets,
  iframes or forms posting elsewhere; outside hosts are Google Fonts (allowed)
  and QR images from `api.qrserver.com` (allowed by `img-src https:`);
- the print page: its one inline script matches the hash in the policy;
- the print templates stored in `pdf_templates`: no scripts, event handlers,
  stylesheets or external URLs.

Violations are still reported to `/api/csp-report` and logged by the API, now
with `"mode":"enforce"`:

```bash
pm2 logs --nostream --lines 5000 | grep csp_violation
```

Browser extensions also cause reports (`blocked` = `chrome-extension`,
`moz-extension`, or a `source` outside the site); those can be ignored.

If something the app needs is blocked, fall back at once: comment out the
`Content-Security-Policy` line, re-enable the `Content-Security-Policy-Report-Only`
line above it, then `nginx -t` and reload. Fix the policy, then switch back.

Re-check before adding a third-party script, an embed, or a print template
that loads scripts or stylesheets from another host.

If the print page's inline script in
`backend/src/pdf-templates/template-renderer.ts` changes, recompute its hash:

```bash
printf "%s" "<script body>" | openssl dgst -sha256 -binary | openssl base64
```
