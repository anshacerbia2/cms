/**
 * Permissions, sidebar entry and starter templates for document printing.
 *
 * Upsert-only and safe against production:
 *
 *   pnpm seed:access
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { ensureMenus, ensurePermissions, MenuSpec, ModuleSpec } from './utils/access-control';

// Print layouts live under Settings and are administrative, like the RBAC modules.
const MODULES: ModuleSpec[] = [{ module: 'pdf-templates', label: 'Print Template', adminOnly: true }];

const MENUS: MenuSpec[] = [
  { id: 6004, parentId: 600, name: 'Print Templates', icon: 'Printer', route: 'pdf-templates.index', order: 4, adminOnly: true },
];

const STARTERS = [
  {
    name: 'Default Invoice',
    type: 'INVOICE' as const,
    file: 'invoice.html',
    description: 'Standard A4 invoice layout.',
  },
  {
    name: 'Default Proposal',
    type: 'PROPOSAL' as const,
    file: 'proposal.html',
    description: 'Standard A4 proposal layout.',
  },
];

export async function seedPdfTemplates(prisma: PrismaClient) {
  console.log('🖨️  Seeding print template permissions, menu and starters...');

  const { created, linked, revoked } = await ensurePermissions(prisma, MODULES);
  console.log(`✅ Print template permissions: ${created} new permission(s), ${linked} role link(s) ensured.`);
  if (revoked) console.log(`↩️  Withdrew ${revoked} viewer grant(s) on print templates.`);

  const menus = await ensureMenus(prisma, MENUS);
  console.log(`✅ Print template menus: ${menus.touched} menu row(s) ensured.`);

  let seeded = 0;

  for (const starter of STARTERS) {
    // Only created when the type has none at all: printing needs a template to
    // exist, but an edited one must never be reverted by a re-run.
    const existing = await prisma.pdfTemplate.count({ where: { type: starter.type } });
    if (existing > 0) continue;

    const htmlContent = readFileSync(join(__dirname, 'templates', starter.file), 'utf8');

    await prisma.pdfTemplate.create({
      data: {
        name: starter.name,
        type: starter.type,
        description: starter.description,
        htmlContent,
        isActive: true,
        variables: [...htmlContent.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
          .map((m) => m[1])
          .filter((name, i, all) => all.indexOf(name) === i)
          .sort()
          .map((name) => ({ name, label: name.replace(/_/g, ' ') })),
      },
    });
    seeded++;
  }

  console.log(`✅ Print templates: ${seeded} starter template(s) created.`);
}
