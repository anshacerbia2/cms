/**
 * Pentest retest 2026-10-02, findings N-02 (malformed IDs/dates crash with 500)
 * and N-03 (PATCH /products/:id accepted any field).
 *
 * Runs the real controllers, services, ValidationPipe and exception filter with
 * the database replaced by a stub, so it needs no database and changes nothing.
 * Every request's status and message is recorded; set SECURITY_HARNESS_LOG to a
 * file path to also write them out as JSON (used for the before/after report).
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { writeFileSync } from 'fs';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { SuppliersController } from '../src/suppliers/suppliers.controller';
import { SuppliersService } from '../src/suppliers/suppliers.service';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { BanksController } from '../src/banks/banks.controller';
import { BanksService } from '../src/banks/banks.service';
import { AccountReceivableController } from '../src/finance/account-receivable/account-receivable.controller';
import { AccountReceivableService } from '../src/finance/account-receivable/account-receivable.service';
import { AccountPayableController } from '../src/finance/account-payable/account-payable.controller';
import { AccountPayableService } from '../src/finance/account-payable/account-payable.service';
import { BankMutationController } from '../src/finance/bank-mutation/bank-mutation.controller';
import { BankMutationService } from '../src/finance/bank-mutation/bank-mutation.service';
import { InvoicesController } from '../src/invoices/invoices.controller';
import { InvoicesService } from '../src/invoices/invoices.service';
import { ProjectsController } from '../src/projects/projects.controller';
import { ProjectsService } from '../src/projects/projects.service';
import { AuditLogsController } from '../src/audit-logs/audit-logs.controller';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

/** Every write the services hand to the database, so a test can see what got through. */
const writes: { model: string; op: string; args: any }[] = [];

function stubModel(model: string) {
  return new Proxy(
    {},
    {
      get: (_t, op: string) => async (args?: any) => {
        if (
          [
            'update',
            'create',
            'upsert',
            'delete',
            'updateMany',
            'deleteMany',
          ].includes(op)
        ) {
          writes.push({ model, op, args });
        }
        if (op === 'findMany' || op === 'groupBy') return [];
        if (op === 'count') return 0;
        if (op === 'aggregate') return { _sum: {}, _count: 0 };
        // A product exists so PATCH /products/1 reaches the update itself.
        if (op === 'findFirst' && model === 'product')
          return { id: 1n, name: 'Stub', priceVersions: [] };
        if (op.startsWith('find')) return null;
        return { id: 1n, priceVersions: [], ...(args?.data ?? {}) };
      },
    },
  );
}

const prismaStub: any = new Proxy(
  {},
  {
    get: (_t, key: string) => {
      if (key === 'then') return undefined;
      if (key === '$transaction')
        return async (x: any) =>
          typeof x === 'function' ? x(prismaStub) : Promise.all(x);
      if (key === '$queryRaw' || key === '$queryRawUnsafe')
        return async () => [];
      if (key.startsWith('$')) return async () => 0;
      return stubModel(key);
    },
  },
);

type Probe = {
  id: string;
  finding: string;
  method: 'get' | 'patch' | 'put' | 'delete';
  url: string;
  body?: any;
};

/** Malformed input that must be refused with 400, never reach the database, never 500. */
const malformed: Probe[] = [
  { id: 'P01', finding: 'N-02', method: 'get', url: '/suppliers/abc' },
  {
    id: 'P02',
    finding: 'N-02',
    method: 'patch',
    url: '/suppliers/abc',
    body: {},
  },
  { id: 'P03', finding: 'N-02', method: 'get', url: '/products/abc' },
  { id: 'P04', finding: 'N-02', method: 'delete', url: '/products/abc' },
  {
    id: 'P05',
    finding: 'N-02',
    method: 'get',
    url: '/banks/internal-accounts/abc',
  },
  {
    id: 'P06',
    finding: 'N-02',
    method: 'put',
    url: '/finance/account-receivable/abc',
    body: {},
  },
  {
    id: 'P07',
    finding: 'N-02',
    method: 'delete',
    url: '/finance/account-payable/abc',
  },
  {
    id: 'P08',
    finding: 'N-02',
    method: 'get',
    url: '/bank-mutation/anchor-balance/abc/2026',
  },
  {
    id: 'P09',
    finding: 'N-02',
    method: 'get',
    url: '/bank-mutation/fiscal-periods?accountId=abc',
  },
  {
    id: 'P10',
    finding: 'N-02',
    method: 'get',
    url: '/invoices?customerId=1.5',
  },
  {
    id: 'P11',
    finding: 'N-02',
    method: 'get',
    url: '/projects?customerId=1.5',
  },
  {
    id: 'P12',
    finding: 'N-02',
    method: 'get',
    url: '/products?categoryId=abc',
  },
  { id: 'P13', finding: 'N-02', method: 'get', url: '/audit-logs?rowId=abc' },
  {
    id: 'P14',
    finding: 'N-02',
    method: 'get',
    url: '/audit-logs?from=not-a-date',
  },
  {
    id: 'P16',
    finding: 'N-03',
    method: 'patch',
    url: '/products/1',
    body: {
      name: 'Stub',
      deletedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2000-01-01T00:00:00.000Z',
    },
  },
];

/** Normal use that must keep working. */
const controls: Probe[] = [
  { id: 'C01', finding: 'control', method: 'get', url: '/suppliers/5' },
  {
    id: 'C02',
    finding: 'control',
    method: 'patch',
    url: '/products/1',
    body: { name: 'Stub', unit: 'Unit', categoryId: '' },
  },
  {
    id: 'C03',
    finding: 'control',
    method: 'get',
    url: '/audit-logs?rowId=12&from=2026-09-01',
  },
  {
    id: 'C04',
    finding: 'control',
    method: 'get',
    url: '/products?limit=10000',
  },
];

describe('Malformed input is refused cleanly (pentest N-02, N-03)', () => {
  let app: INestApplication;
  const log: any[] = [];

  async function send(p: Probe) {
    writes.length = 0;
    const req = request(app.getHttpServer())[p.method](p.url);
    const res = p.body ? await req.send(p.body) : await req;
    const message = res.body?.message;
    const entry = {
      id: p.id,
      finding: p.finding,
      request: `${p.method.toUpperCase()} ${p.url}${p.body ? ' ' + JSON.stringify(p.body) : ''}`,
      status: res.status,
      message: Array.isArray(message) ? message.join('; ') : message,
      reachedDatabase: writes.map((w) => ({
        [`${w.model}.${w.op}`]: w.args?.data ?? w.args,
      })),
      pageSizeUsed: res.body?.meta?.limit,
    };
    log.push(entry);
    return entry;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        SuppliersController,
        ProductsController,
        BanksController,
        AccountReceivableController,
        AccountPayableController,
        BankMutationController,
        InvoicesController,
        ProjectsController,
        AuditLogsController,
      ],
      providers: [
        SuppliersService,
        ProductsService,
        BanksService,
        AccountReceivableService,
        AccountPayableService,
        BankMutationService,
        InvoicesService,
        ProjectsService,
        AuditLogsService,
        { provide: PrismaService, useValue: prismaStub },
      ],
    })
      // Stub only real service dependencies. `Object` is how an optional settings
      // argument (e.g. ParseIntPipe's options) shows up; it must stay unset.
      .useMocker((token) =>
        token === Object
          ? undefined
          : new Proxy(
              {},
              {
                get: (_t, key) =>
                  key === 'then' ? undefined : async () => undefined,
              },
            ),
      )
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          ctx.switchToHttp().getRequest().user = {
            userId: '1',
            role: 'admin',
            permissions: [],
          };
          return true;
        },
      })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    if (process.env.SECURITY_HARNESS_LOG)
      writeFileSync(
        process.env.SECURITY_HARNESS_LOG,
        JSON.stringify(log, null, 2),
      );
    await app?.close();
  });

  it.each(malformed)('$id $method $url → 400, nothing written', async (p) => {
    const r = await send(p);
    expect(r.status).toBe(400);
    expect(r.reachedDatabase).toEqual([]);
  });

  it('C01 a valid supplier id still reaches the service (404 from the empty stub)', async () => {
    expect((await send(controls[0])).status).toBe(404);
  });

  it('C02 the product form still saves; an empty category is ignored, as before', async () => {
    const r = await send(controls[1]);
    expect(r.status).toBeLessThan(400);
    expect(r.reachedDatabase).toEqual([
      {
        'product.update': {
          name: 'Stub',
          unit: 'Unit',
          categoryId: undefined,
          supplierId: undefined,
        },
      },
    ]);
  });

  it('C03 valid audit-log filters still work', async () => {
    expect((await send(controls[2])).status).toBe(200);
  });

  it('C04 the largest page size the UI asks for (10000) is still allowed', async () => {
    const r = await send(controls[3]);
    expect(r.status).toBe(200);
    expect(r.pageSizeUsed).toBe(10000);
  });

  it('P15 an oversized page size is capped at 10000, not passed to the database', async () => {
    const r = await send({
      id: 'P15',
      finding: 'N-02',
      method: 'get',
      url: '/products?limit=999999999',
    });
    expect(r.status).toBe(200);
    expect(r.pageSizeUsed).toBe(10000);
  });
});
