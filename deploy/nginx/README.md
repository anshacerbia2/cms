# nginx for pcmi-admin.online

`pcmi-admin.conf` is the proposed `/etc/nginx/sites-available/pcmi-admin`,
the live file plus the server-side fixes from the 2026-09-30 pentest:

| Finding | Change |
|---|---|
| F-01 | `limit_req` on `/api/auth/login` (10/min per IP, burst 5, 429); `X-Real-IP` / `X-Forwarded-For` passed to the API so its own per-IP limit sees real clients |
| F-03 | Content-Security-Policy, first as Report-Only |
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

1. Install with `Content-Security-Policy-Report-Only` (as shipped). Nothing is
   blocked; violations appear in the browser console (F12).
2. Use the app for a few days: every finance page, exports, Activity Log,
   and printing an invoice/proposal (its print page runs one inline script,
   allowed by hash). Check the console for "Content Security Policy" reports.
3. When clean, comment out the Report-Only line and enable the
   `Content-Security-Policy` line below it, then `nginx -t` and reload.

If the print page's inline script in
`backend/src/pdf-templates/template-renderer.ts` changes, recompute its hash:

```bash
printf "%s" "<script body>" | openssl dgst -sha256 -binary | openssl base64
```
