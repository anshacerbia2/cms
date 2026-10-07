/**
 * Placeholder substitution for print templates: `{{name}}` is replaced with the
 * matching value.
 *
 * Values are HTML-escaped by default, because they come from user-entered
 * records — a customer named `Smith & Co <Ltd>` would otherwise break the markup,
 * and a crafted note could inject script into the printed page. Fields the
 * caller builds as markup itself (table rows, totals blocks) are passed through
 * `rawKeys` to opt out; nothing from the database reaches those directly.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function renderTemplate(
  html: string,
  data: Record<string, unknown>,
  rawKeys: string[] = [],
): string {
  const raw = new Set(rawKeys);

  // Replaces every placeholder in one pass, so a value that happens to contain
  // `{{...}}` cannot be expanded again as if it were a placeholder itself.
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    if (!(key in data)) return '';
    return raw.has(key) ? String(data[key] ?? '') : escapeHtml(data[key]);
  });
}

/** Placeholder names actually present in a template, for the editor's hints. */
export function extractVariables(html: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    found.add(match[1]);
  }
  return [...found].sort();
}

/**
 * Content-Security-Policy for the printable page itself.
 *
 * The page is opened in a new tab via window.open('') + document.write (see the
 * frontend's useDocumentPrint), so it is an about:blank document that never
 * receives nginx's response-header CSP. Without a policy of its own, a <script>
 * embedded in a stored print template would run at the app's origin in the
 * browser of whoever prints the document (pentest N-06).
 *
 * script-src pins ONLY the auto-print script below, by hash - no 'unsafe-inline'
 * - so that one script runs while any script a template tries to inject is
 * blocked. The hash must stay in step with PRINT_SCRIPT (and with the hash in
 * deploy/nginx/pcmi-admin.conf). style-src keeps 'unsafe-inline' because
 * templates and the UI set inline styles; img-src mirrors the server CSP:
 * 'self'/data:/blob: plus the QR-code host, not all of https: (pentest N-09),
 * so a template cannot beacon to an arbitrary host on print. Add any other
 * image host a template legitimately needs here and in the nginx config.
 */
const PRINT_SCRIPT = `window.addEventListener('load', function () { window.print(); });`;
const PRINT_SCRIPT_HASH = 'sha256-JvP7+dR0/uG+XdJLQ3VY1tsCgjRYmPOpus5OtsH4uU8=';
const PRINT_CSP = [
  `default-src 'none'`,
  `img-src 'self' data: blob: https://api.qrserver.com`,
  `style-src 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src https://fonts.gstatic.com data:`,
  `script-src '${PRINT_SCRIPT_HASH}'`,
  `base-uri 'none'`,
  `form-action 'none'`,
].join('; ');

/**
 * Wraps a rendered template into a standalone printable page.
 *
 * The legacy app pulled html2pdf from a CDN and converted in the browser. Using
 * the browser's own print dialog instead keeps the page working without network
 * access to a third party, and its "Save as PDF" produces the same result.
 */
export function toPrintablePage(html: string, title: string, autoPrint = true): string {
  const script = autoPrint ? `<script>${PRINT_SCRIPT}</script>` : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${PRINT_CSP}">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  @media print { .no-print { display: none !important; } }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
</style>
</head>
<body>
${html}
${script}
</body>
</html>`;
}
