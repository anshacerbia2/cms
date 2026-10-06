import { Body, Controller, HttpCode, Logger, Post, Request } from '@nestjs/common';

/** Paling banyak sekian baris log per menit; selebihnya dibuang (endpoint ini publik). */
const MAX_LINES_PER_MINUTE = 30;
/** Pelanggaran yang sama (halaman + direktif + sumber) dicatat sekali per jam. */
const DEDUPE_MS = 60 * 60_000;
const MAX_FIELD = 300;

/**
 * Penerima laporan Content-Security-Policy (pentest F-03).
 *
 * nginx mengirim CSP dengan `report-uri /api/csp-report`; browser mengirim
 * setiap pelanggaran ke sini, dan setiap pelanggaran ditulis sebagai satu baris
 * JSON di log pm2 (`pm2 logs | grep csp_violation`). Dengan begitu header
 * Report-Only bisa dipantau dari server sebelum diganti menjadi yang memblokir,
 * tanpa harus membuka console browser setiap user.
 *
 * Tanpa login: browser mengirim laporan tanpa token. Isinya hanya dicatat,
 * dibatasi panjang dan jumlahnya, dan tidak pernah disimpan ke database.
 */
@Controller('csp-report')
export class CspReportController {
  private readonly logger = new Logger('CSP');
  private readonly seen = new Map<string, number>();
  private windowStart = 0;
  private linesInWindow = 0;

  @Post()
  @HttpCode(204)
  report(@Body() body: any, @Request() req: any): void {
    // report-uri mengirim { "csp-report": {...} }; Reporting API mengirim [{ type, body }].
    const reports: any[] = Array.isArray(body)
      ? body.filter((r) => r?.type === 'csp-violation').map((r) => r.body)
      : [body?.['csp-report']];

    const now = Date.now();
    for (const r of reports.slice(0, 10)) {
      if (!r || typeof r !== 'object') continue;
      const entry = {
        event: 'csp_violation',
        ip: req.ip ?? 'unknown',
        page: this.clip(r['document-uri'] ?? r.documentURL),
        directive: this.clip(r['effective-directive'] ?? r.effectiveDirective ?? r['violated-directive']),
        blocked: this.clip(r['blocked-uri'] ?? r.blockedURL),
        source: this.clip(
          [r['source-file'] ?? r.sourceFile, r['line-number'] ?? r.lineNumber].filter(Boolean).join(':'),
        ),
        sample: this.clip(r['script-sample'] ?? r.sample),
        mode: this.clip(r.disposition) ?? 'report',
      };
      if (this.shouldLog(`${entry.page}|${entry.directive}|${entry.blocked}`, now)) {
        this.logger.warn(JSON.stringify(entry));
      }
    }
  }

  private shouldLog(key: string, now: number): boolean {
    if ((this.seen.get(key) ?? 0) > now - DEDUPE_MS) return false;
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.linesInWindow = 0;
    }
    if (this.linesInWindow >= MAX_LINES_PER_MINUTE) return false;
    this.linesInWindow++;
    if (this.seen.size >= 1000) {
      for (const [k, t] of this.seen) if (t <= now - DEDUPE_MS) this.seen.delete(k);
      if (this.seen.size >= 1000) this.seen.clear();
    }
    this.seen.set(key, now);
    return true;
  }

  private clip(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value).slice(0, MAX_FIELD);
  }
}
