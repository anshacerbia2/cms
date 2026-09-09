import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfTemplatesService } from './pdf-templates.service';
import { PdfTemplateTypeDto } from './dto/create-pdf-template.dto';
import { escapeHtml, renderTemplate, toPrintablePage } from './template-renderer';

/** Fields the caller builds as markup; everything else is escaped. */
const RAW_KEYS = ['items_rows', 'totals_rows'];

const IDR = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const money = (value: unknown) => IDR.format(Number(value ?? 0));

const longDate = (value: unknown) =>
  value
    ? new Date(value as string).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-';

@Injectable()
export class DocumentPrintService {
  constructor(
    private prisma: PrismaService,
    private templates: PdfTemplatesService,
  ) {}

  async printInvoice(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        project: true,
        proposal: { include: { project: true } },
        customer: true,
        billingOption: true,
        internalAccount: { include: { bank: true } },
        salesItems: { orderBy: [{ headerOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);

    const template = await this.requireTemplate(PdfTemplateTypeDto.INVOICE);
    const totals = this.invoiceTotals(invoice);
    const project = invoice.project ?? invoice.proposal?.project;

    const data = {
      invoice_code: invoice.code,
      invoice_number: invoice.invoiceNumber,
      // There is no separate issue date on the record; the row's creation date is
      // the only date the invoice was actually raised on.
      invoice_date: longDate(invoice.createdAt),
      due_date: longDate(invoice.dueDate),
      customer_name: invoice.customer?.name ?? '-',
      bill_to: invoice.billingOption?.address ?? invoice.customer?.name ?? '-',
      bill_to_contact: invoice.billingOption?.cpName ?? '',
      project_name: invoice.projectName ?? project?.name ?? '-',
      project_description: invoice.projectDescription ?? project?.description ?? '',
      sales_code: invoice.salesCode ?? '-',
      tax_type: invoice.taxType,
      billing_type: invoice.billingType,
      status: invoice.status,
      payment_status: invoice.paymentStatus,
      bank_name: invoice.internalAccount?.bank?.bankName ?? '-',
      bank_account: invoice.internalAccount?.accountNo ?? '-',
      bank_account_name: invoice.internalAccount?.holderName ?? '-',
      bank_branch: invoice.internalAccount?.branch ?? '',
      notes: invoice.description ?? '',
      items_rows: this.itemsRows(invoice.salesItems),
      totals_rows: totals,
    };

    return toPrintablePage(
      renderTemplate(template.htmlContent, data, RAW_KEYS),
      `Invoice-${invoice.code}`,
    );
  }

  async printProposal(id: number) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: BigInt(id) },
      include: {
        project: { include: { customer: true } },
        salesItems: { orderBy: [{ headerOrder: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!proposal) throw new NotFoundException(`Proposal with ID ${id} not found`);

    const template = await this.requireTemplate(PdfTemplateTypeDto.PROPOSAL);

    const base = Number(proposal.totalAmountItems ?? 0);
    const fee =
      proposal.managementFeeType === 'PERCENT'
        ? Math.round(((base * Number(proposal.managementFee)) / 100) * 100) / 100
        : Number(proposal.managementFee);
    const sales = Math.round((base + fee) * 100) / 100;
    const vat = Math.round(((sales * Number(proposal.vatRate ?? 0)) / 100) * 100) / 100;

    const data = {
      proposal_code: proposal.code,
      proposal_date: longDate(proposal.createdAt),
      sales_code: proposal.salesCode ?? '-',
      status: proposal.status,
      customer_name: proposal.project?.customer?.name ?? '-',
      project_name: proposal.project?.name ?? '-',
      project_description: proposal.project?.description ?? '',
      pricing_model: proposal.pricingModel ?? '-',
      pricing_model_description: proposal.pricingModelDescription ?? '',
      notes: proposal.note ?? '',
      items_rows: this.itemsRows(proposal.salesItems),
      totals_rows: this.totalsRows([
        ['Subtotal', base],
        [
          proposal.managementFeeType === 'PERCENT'
            ? `Management Fee (${Number(proposal.managementFee)}%)`
            : 'Management Fee',
          fee,
        ],
        ['Sales Amount', sales],
        [`VAT (${proposal.vatRate}%)`, vat],
        ['Total', Math.round((sales + vat) * 100) / 100],
      ]),
    };

    return toPrintablePage(
      renderTemplate(template.htmlContent, data, RAW_KEYS),
      `Proposal-${proposal.code}`,
    );
  }

  private async requireTemplate(type: PdfTemplateTypeDto) {
    const template = await this.templates.findActive(type);
    if (!template) {
      throw new NotFoundException(
        `No active ${type.toLowerCase()} template. Create one under Settings › Print Templates.`,
      );
    }
    return template;
  }

  /** Mirrors the invoice service's own arithmetic so the print matches the screen. */
  private invoiceTotals(invoice: any) {
    const base = Number(invoice.totalAmount ?? 0);
    const feeValue = Number(invoice.managementFee ?? 0);
    const fee =
      invoice.managementFeeType === 'PERCENT'
        ? Math.round(((base * feeValue) / 100) * 100) / 100
        : feeValue;
    const sales = Math.round((base + fee) * 100) / 100;
    const vat =
      invoice.taxType === 'NO_TAX'
        ? 0
        : Math.round(((sales * Number(invoice.vatRate ?? 0)) / 100) * 100) / 100;

    const rows: [string, number][] = [
      ['Subtotal', base],
      [invoice.managementFeeType === 'PERCENT' ? `Management Fee (${feeValue}%)` : 'Management Fee', fee],
      ['Sales Amount', sales],
    ];

    if (invoice.taxType !== 'NO_TAX') rows.push([`VAT (${invoice.vatRate}%)`, vat]);
    rows.push(['Invoice Amount', Math.round((sales + vat) * 100) / 100]);
    rows.push(['Balance Due', Number(invoice.balanceDue ?? 0)]);

    return this.totalsRows(rows);
  }

  private totalsRows(rows: [string, number][]) {
    return rows
      .map(
        ([label, value]) =>
          `<tr><td class="totals-label">${escapeHtml(label)}</td>` +
          `<td class="totals-value">${money(value)}</td></tr>`,
      )
      .join('\n');
  }

  private itemsRows(items: any[]) {
    if (!items?.length) {
      return '<tr><td colspan="5" class="empty">No items</td></tr>';
    }

    return items
      .map((item, index) => {
        const qty = Number(item.title1Value ?? 1);
        return (
          '<tr>' +
          `<td class="num">${index + 1}</td>` +
          `<td>${escapeHtml(item.description ?? item.productName ?? '-')}</td>` +
          `<td class="num">${qty}</td>` +
          `<td class="money">${money(item.sellingPrice)}</td>` +
          `<td class="money">${money(item.totalPrice)}</td>` +
          '</tr>'
        );
      })
      .join('\n');
  }
}
