/**
 * Pentest retest 2026-10-02, finding F-03 (CSP still Report-Only, and its
 * violations were only visible in each user's browser console).
 *
 * Runs the real CspReportController with the same body parser setup as main.ts
 * and checks that both report formats browsers send are logged as one JSON
 * line, that repeats are deduplicated, and that junk is answered 204 quietly.
 */
import { Test } from '@nestjs/testing';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { CspReportController } from '../src/csp-report/csp-report.controller';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('CSP report endpoint (F-03)', () => {
  let app: NestExpressApplication;
  let warn: jest.SpyInstance;

  const logged = () => warn.mock.calls.map(([line]) => JSON.parse(line));
  const legacy = (blocked: string) => ({
    'csp-report': {
      'document-uri': 'https://pcmi-admin.online/invoices',
      'violated-directive': 'script-src-elem',
      'effective-directive': 'script-src-elem',
      'blocked-uri': blocked,
      'source-file': 'https://pcmi-admin.online/invoices',
      'line-number': 12,
      disposition: 'report',
    },
  });

  beforeEach(async () => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({ controllers: [CspReportController] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useBodyParser('json', { type: ['application/json', 'application/csp-report', 'application/reports+json'] });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('logs a report-uri report (application/csp-report)', async () => {
    await request(app.getHttpServer())
      .post('/api/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify(legacy('inline')))
      .expect(204);
    expect(logged()).toEqual([
      expect.objectContaining({
        event: 'csp_violation',
        page: 'https://pcmi-admin.online/invoices',
        directive: 'script-src-elem',
        blocked: 'inline',
        source: 'https://pcmi-admin.online/invoices:12',
        mode: 'report',
      }),
    ]);
  });

  it('logs a Reporting API report (application/reports+json)', async () => {
    await request(app.getHttpServer())
      .post('/api/csp-report')
      .set('Content-Type', 'application/reports+json')
      .send(
        JSON.stringify([
          {
            type: 'csp-violation',
            body: {
              documentURL: 'https://pcmi-admin.online/print',
              effectiveDirective: 'img-src',
              blockedURL: 'http://example.com/logo.png',
              disposition: 'enforce',
            },
          },
          { type: 'deprecation', body: {} },
        ]),
      )
      .expect(204);
    expect(logged()).toEqual([
      expect.objectContaining({ directive: 'img-src', blocked: 'http://example.com/logo.png', mode: 'enforce' }),
    ]);
  });

  it('logs the same violation only once', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/api/csp-report')
        .set('Content-Type', 'application/csp-report')
        .send(JSON.stringify(legacy('inline')))
        .expect(204);
    }
    expect(logged()).toHaveLength(1);
  });

  it('caps how much one report can write', async () => {
    await request(app.getHttpServer())
      .post('/api/csp-report')
      .set('Content-Type', 'application/csp-report')
      .send(JSON.stringify(legacy('x'.repeat(5000))))
      .expect(204);
    expect(logged()[0].blocked).toHaveLength(300);
  });

  it('answers junk with 204 and logs nothing', async () => {
    await request(app.getHttpServer()).post('/api/csp-report').send({ hello: 'world' }).expect(204);
    await request(app.getHttpServer())
      .post('/api/csp-report')
      .set('Content-Type', 'application/reports+json')
      .send('[1, null, "x"]')
      .expect(204);
    expect(logged()).toHaveLength(0);
  });
});
