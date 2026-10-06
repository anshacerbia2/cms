import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';

/** Laporan per menit yang ditulis ke log; sisanya hanya dihitung. */
const MAX_PER_MINUTE = 30;

/**
 * Penerima laporan pelanggaran Content-Security-Policy dari browser
 * (`report-uri /api/csp-report` di nginx).
 *
 * Kalau CSP memblokir sesuatu yang sebenarnya dibutuhkan halaman - script,
 * font, gambar - di sinilah terlihat, di log server, tanpa menunggu user
 * melapor. Tanpa login dan tanpa header X-Requested-With (browser tidak
 * mengirimnya), jadi isinya hanya dicatat, tidak pernah dipakai.
 */
@Controller('csp-report')
export class CspReportController {
  private readonly logger = new Logger('CSP');
  private windowStart = 0;
  private count = 0;

  @Post()
  @HttpCode(204)
  report(@Body() body: any) {
    const now = Date.now();
    if (now - this.windowStart > 60_000) {
      if (this.count > MAX_PER_MINUTE) this.logger.warn(`${this.count - MAX_PER_MINUTE} more report(s) not logged.`);
      this.windowStart = now;
      this.count = 0;
    }
    if (++this.count > MAX_PER_MINUTE) return;

    // Format lama: { "csp-report": {...} }. Reporting API: [{ type, body: {...} }].
    const r = body?.['csp-report'] ?? (Array.isArray(body) ? body[0]?.body : body) ?? {};
    const pick = (...keys: string[]) => keys.map((k) => r[k]).find((v) => v != null);
    const line = [
      `blocked ${pick('blocked-uri', 'blockedURL') ?? '?'}`,
      `by ${pick('violated-directive', 'effective-directive', 'effectiveDirective') ?? '?'}`,
      `on ${pick('document-uri', 'documentURL') ?? '?'}`,
      pick('source-file', 'sourceFile') ? `at ${pick('source-file', 'sourceFile')}:${pick('line-number', 'lineNumber') ?? ''}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    this.logger.warn(line.slice(0, 500));
  }
}
