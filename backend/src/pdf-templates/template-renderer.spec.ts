import { renderTemplate, toPrintablePage } from './template-renderer';

describe('toPrintablePage — print-page CSP (pentest N-06)', () => {
  const page = (autoPrint = true) =>
    toPrintablePage(
      renderTemplate(
        '<h1>Invoice {{num}}</h1><script>fetch("/api/users")</script><img src=x onerror="alert(1)">',
        { num: '42' },
      ),
      'Invoice',
      autoPrint,
    );

  it('carries a Content-Security-Policy meta as the first head directive', () => {
    expect(page()).toMatch(/<meta http-equiv="Content-Security-Policy" content="[^"]+">/);
  });

  it('pins script execution to the auto-print hash only, with no unsafe-inline', () => {
    const html = page();
    expect(html).toContain(
      "script-src 'sha256-JvP7+dR0/uG+XdJLQ3VY1tsCgjRYmPOpus5OtsH4uU8='",
    );
    // No 'unsafe-inline' anywhere in the script-src source list.
    const csp = html.match(/content="([^"]+)"/)![1];
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))!;
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  it('keeps the hash-allowlisted auto-print script when autoPrint is on', () => {
    expect(page(true)).toContain(
      '<script>window.addEventListener(\'load\', function () { window.print(); });</script>',
    );
  });

  it('emits no script element when autoPrint is off (preview)', () => {
    expect(page(false)).not.toContain('<script>window.addEventListener');
  });

  it('leaves an injected template <script> in the body, now neutralised by the CSP', () => {
    // The payload survives in the markup, but the CSP above blocks its
    // execution: script-src allows only the auto-print hash, and default-src
    // 'none' (no unsafe-inline) blocks the inline onerror handler too.
    expect(page()).toContain('<script>fetch("/api/users")</script>');
  });
});
