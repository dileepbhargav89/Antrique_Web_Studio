import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface QuotationPdfLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface QuotationPdfPaymentStage {
  label: string;
  triggerNote: string | null;
  percentage: string;
  amount: string;
}

export interface QuotationPdfBranding {
  companyName: string | null;
  tagline: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  bankDetails: string | null;
  // Already-downloaded bytes (QuotationService resolves this via
  // StorageService.download() before calling render()) — keeps this
  // service a pure, dependency-free renderer, same "framework-agnostic"
  // shape DocumentPdfService already established (no StorageService
  // import here, no I/O of its own).
  logoBuffer: Buffer | null;
}

export interface QuotationPdfInput {
  quotationNumber: string;
  issuedDate: Date | null;
  validUntil: Date | null;
  currency: string;
  billToName: string;
  billToOrganization: string | null;
  billToEmail: string | null;
  lineItems: QuotationPdfLineItem[];
  subtotalAmount: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
  paymentStages: QuotationPdfPaymentStage[];
  branding: QuotationPdfBranding;
}

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 pt
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const INK = '#1a1a1a';
const MUTED = '#6b6b6b';
const RULE = '#d9d9d9';
const ACCENT = '#8a6d2f';

const OUR_PROCESS_STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: '1. Discovery & Requirements',
    body: 'We start by understanding your goals, audience, and constraints — turning them into a clear, written scope before any design or code work begins.',
  },
  {
    title: '2. Design & Prototyping',
    body: 'Wireframes and visual design are reviewed with you at each stage, so the direction is agreed before it becomes production work.',
  },
  {
    title: '3. Development',
    body: 'The approved design is built against the agreed scope, with regular progress check-ins rather than a single opaque delivery at the end.',
  },
  {
    title: '4. Testing & QA',
    body: 'Every feature is tested across devices and browsers, and against the original requirements, before anything is presented as complete.',
  },
  {
    title: '5. Deployment & Launch',
    body: 'We handle the technical launch — hosting, domain, and configuration — and confirm everything works in the live environment.',
  },
  {
    title: '6. Support & Maintenance',
    body: 'After launch, we remain available for fixes and questions, and can continue on a support arrangement for ongoing changes.',
  },
];

// New (this phase) — the professional, multi-page quotation letterhead
// pdf/README.md's own "no logo/theming, no multi-page pagination" gap
// explicitly flagged as expected follow-up work. A separate service from
// DocumentPdfService (which now serves Invoice only): a cover page,
// company/process narrative, and a payment schedule have no equivalent in
// an Invoice, so sharing one renderer stopped making sense once Quotation
// grew real structural differences — see that file's own comment for why
// ONE shared renderer was originally chosen, and why this phase is what
// changes that. Stays on `pdfkit` (imperative, no React/JSX) for the same
// reason DocumentPdfService did — see pdf/README.md — plus a second one
// specific to this phase: a headless-Chromium HTML-to-PDF approach would
// be a materially heavier runtime dependency on Render's free tier
// (real OOM risk on a memory-constrained instance), not worth it for a
// document pdfkit can already produce well with more manual layout code.
@Injectable()
export class QuotationPdfService {
  render(input: QuotationPdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderCoverPage(doc, input);
      doc.addPage();
      this.renderAboutAndProcessPage(doc, input.branding);
      doc.addPage();
      this.renderScopeOfWorkPage(doc, input);
      doc.addPage();
      this.renderPaymentAndTermsPage(doc, input);
      doc.addPage();
      this.renderAcceptancePage(doc, input);

      this.applyFooters(doc, input.branding.companyName);

      doc.end();
    });
  }

  private renderCoverPage(doc: PDFKit.PDFDocument, input: QuotationPdfInput): void {
    const { branding } = input;
    let y = 90;

    if (branding.logoBuffer) {
      try {
        doc.image(branding.logoBuffer, PAGE_WIDTH / 2 - 60, y, {
          fit: [120, 120],
          align: 'center',
        });
        y += 140;
      } catch {
        // Malformed/unsupported image bytes — a cover page without a logo
        // is a fine degradation; failing the whole PDF over a bad image
        // is not.
      }
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor(INK)
      .text(branding.companyName ?? 'Proposal', PAGE_MARGIN, y, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
    y = doc.y + 4;

    if (branding.tagline) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(MUTED)
        .text(branding.tagline, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
      y = doc.y;
    }

    y += 30;
    doc
      .moveTo(PAGE_MARGIN + CONTENT_WIDTH / 2 - 60, y)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH / 2 + 60, y)
      .strokeColor(ACCENT)
      .lineWidth(1.5)
      .stroke();
    y += 24;

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(INK)
      .text('PROPOSAL', PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
    y = doc.y + 6;
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(MUTED)
      .text(`No. ${input.quotationNumber}`, PAGE_MARGIN, y, {
        width: CONTENT_WIDTH,
        align: 'center',
      });
    y = doc.y + 40;

    const boxWidth = 220;
    const leftX = PAGE_MARGIN + CONTENT_WIDTH / 2 - boxWidth - 10;
    const rightX = PAGE_MARGIN + CONTENT_WIDTH / 2 + 10;

    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('PREPARED FOR', leftX, y);
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(INK)
      .text(input.billToOrganization ?? input.billToName, leftX, doc.y + 2, { width: boxWidth });
    if (input.billToOrganization) {
      doc
        .fontSize(10)
        .fillColor(MUTED)
        .text(input.billToName, leftX, doc.y + 2, { width: boxWidth });
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED).text('PREPARED BY', rightX, y);
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(INK)
      .text(branding.companyName ?? '—', rightX, doc.y + 2, { width: boxWidth });
    if (input.issuedDate) {
      doc
        .fontSize(10)
        .fillColor(MUTED)
        .text(input.issuedDate.toLocaleDateString(), rightX, doc.y + 2, { width: boxWidth });
    }
  }

  private renderAboutAndProcessPage(doc: PDFKit.PDFDocument, branding: QuotationPdfBranding): void {
    this.renderPageHeading(doc, 'About Us');
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(INK)
      .text(
        branding.companyName
          ? `${branding.companyName} is a full-service web agency delivering scoped, tested, and supported digital work — from first requirements conversation through launch and beyond.`
          : 'A full-service web agency delivering scoped, tested, and supported digital work — from first requirements conversation through launch and beyond.',
        { width: CONTENT_WIDTH, align: 'left' },
      );

    doc.moveDown(2);
    this.renderPageHeading(doc, 'Our Process', false);
    doc.moveDown(0.5);

    for (const step of OUR_PROCESS_STEPS) {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(INK)
        .text(step.title, { width: CONTENT_WIDTH });
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(step.body, { width: CONTENT_WIDTH });
      doc.moveDown(0.8);
    }
  }

  private renderScopeOfWorkPage(doc: PDFKit.PDFDocument, input: QuotationPdfInput): void {
    this.renderPageHeading(doc, 'Scope of Work');
    doc.moveDown(0.5);

    // Widths sum to CONTENT_WIDTH (495pt) exactly, each column's right
    // edge landing on the next column's x (or the page margin, for the
    // last one) — a header/data mismatch here is what silently wrapped
    // "AMOUNT" onto two lines and let data cells overrun the right
    // margin in an earlier pass; every text() below now gets an explicit
    // width that keeps it inside its own column.
    const columns = {
      description: { x: PAGE_MARGIN, width: 250 },
      quantity: { x: PAGE_MARGIN + 260, width: 40 },
      unitPrice: { x: PAGE_MARGIN + 310, width: 100 },
      amount: { x: PAGE_MARGIN + 420, width: 75 },
    };
    const tableTop = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(MUTED)
      .text('DESCRIPTION', columns.description.x, tableTop, { width: columns.description.width })
      .text('QTY', columns.quantity.x, tableTop, { width: columns.quantity.width })
      .text('UNIT PRICE', columns.unitPrice.x, tableTop, { width: columns.unitPrice.width })
      .text('AMOUNT', columns.amount.x, tableTop, { width: columns.amount.width, align: 'right' });
    doc
      .moveTo(PAGE_MARGIN, tableTop + 16)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, tableTop + 16)
      .strokeColor(RULE)
      .lineWidth(1)
      .stroke();

    let rowY = tableTop + 26;
    for (const item of input.lineItems) {
      const descHeight = doc
        .font('Helvetica')
        .fontSize(10)
        .heightOfString(item.description, { width: columns.description.width });
      doc
        .fillColor(INK)
        .text(item.description, columns.description.x, rowY, { width: columns.description.width })
        .text(item.quantity, columns.quantity.x, rowY, { width: columns.quantity.width })
        .text(`${input.currency} ${item.unitPrice}`, columns.unitPrice.x, rowY, {
          width: columns.unitPrice.width,
        })
        .text(`${input.currency} ${item.amount}`, columns.amount.x, rowY, {
          width: columns.amount.width,
          align: 'right',
        });
      rowY += Math.max(descHeight, 14) + 10;
    }

    doc
      .moveTo(PAGE_MARGIN, rowY + 4)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, rowY + 4)
      .strokeColor(RULE)
      .stroke();
    rowY += 18;

    const totalsRow = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 11 : 10)
        .fillColor(bold ? INK : MUTED)
        .text(label, columns.unitPrice.x, rowY, { width: columns.unitPrice.width })
        .fillColor(INK)
        .text(value, columns.amount.x, rowY, { width: columns.amount.width, align: 'right' });
      rowY += bold ? 20 : 16;
    };
    totalsRow('Subtotal', `${input.currency} ${input.subtotalAmount}`);
    if (Number(input.discountAmount) > 0) {
      totalsRow('Discount', `-${input.currency} ${input.discountAmount}`);
    }
    totalsRow('Tax', `${input.currency} ${input.taxAmount}`);
    totalsRow('Total', `${input.currency} ${input.totalAmount}`, true);
  }

  private renderPaymentAndTermsPage(doc: PDFKit.PDFDocument, input: QuotationPdfInput): void {
    this.renderPageHeading(doc, 'Payment Schedule');
    doc.moveDown(0.5);

    // Same explicit-width-per-column discipline as the Scope of Work
    // table — widths sum to CONTENT_WIDTH exactly.
    const columns = {
      stage: { x: PAGE_MARGIN, width: 130 },
      trigger: { x: PAGE_MARGIN + 140, width: 220 },
      percentage: { x: PAGE_MARGIN + 370, width: 40 },
      amount: { x: PAGE_MARGIN + 420, width: 75 },
    };
    const tableTop = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(MUTED)
      .text('STAGE', columns.stage.x, tableTop, { width: columns.stage.width })
      .text('DUE', columns.trigger.x, tableTop, { width: columns.trigger.width })
      .text('%', columns.percentage.x, tableTop, { width: columns.percentage.width })
      .text('AMOUNT', columns.amount.x, tableTop, { width: columns.amount.width, align: 'right' });
    doc
      .moveTo(PAGE_MARGIN, tableTop + 16)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, tableTop + 16)
      .strokeColor(RULE)
      .stroke();

    let rowY = tableTop + 26;
    for (const stage of input.paymentStages) {
      const triggerText = stage.triggerNote ?? '—';
      const rowHeight = Math.max(
        doc
          .font('Helvetica')
          .fontSize(10)
          .heightOfString(stage.label, { width: columns.stage.width }),
        doc
          .font('Helvetica')
          .fontSize(9)
          .heightOfString(triggerText, { width: columns.trigger.width }),
      );
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(stage.label, columns.stage.x, rowY, { width: columns.stage.width });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(triggerText, columns.trigger.x, rowY, { width: columns.trigger.width });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(INK)
        .text(`${stage.percentage}%`, columns.percentage.x, rowY, {
          width: columns.percentage.width,
        })
        .text(`${input.currency} ${stage.amount}`, columns.amount.x, rowY, {
          width: columns.amount.width,
          align: 'right',
        });
      rowY += Math.max(rowHeight, 14) + 12;
    }

    rowY += 10;
    doc
      .moveTo(PAGE_MARGIN, rowY)
      .lineTo(PAGE_MARGIN + CONTENT_WIDTH, rowY)
      .strokeColor(RULE)
      .stroke();
    rowY += 20;

    doc.y = rowY;
    this.renderPageHeading(doc, 'Terms & Conditions', false);
    doc.moveDown(0.3);

    const terms: string[] = [];
    if (input.validUntil) {
      terms.push(`This quotation is valid until ${input.validUntil.toLocaleDateString()}.`);
    }
    terms.push(
      'Work begins once the advance payment stage above is received; each subsequent stage becomes due on reaching the milestone described.',
    );
    terms.push(
      'Ownership of final deliverables transfers to the client upon receipt of the final payment stage in full.',
    );
    terms.push(
      'Revisions outside the agreed scope of work are billed separately and quoted before work begins.',
    );

    doc.font('Helvetica').fontSize(9.5).fillColor(INK);
    for (const term of terms) {
      doc.text(`•  ${term}`, { width: CONTENT_WIDTH });
      doc.moveDown(0.3);
    }

    if (input.branding.bankDetails) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(MUTED).text('PAYMENT DETAILS');
      doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(input.branding.bankDetails, {
        width: CONTENT_WIDTH,
      });
    }

    if (input.notes) {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(MUTED).text('NOTES');
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(INK)
        .text(input.notes, { width: CONTENT_WIDTH });
    }
  }

  private renderAcceptancePage(doc: PDFKit.PDFDocument, input: QuotationPdfInput): void {
    this.renderPageHeading(doc, 'Acceptance');
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(INK)
      .text(
        `Thank you for considering ${input.branding.companyName ?? 'us'} for this project. ` +
          'Signing below (or replying to confirm) indicates acceptance of the scope, process, and payment schedule described in this proposal.',
        { width: CONTENT_WIDTH },
      );

    doc.moveDown(4);
    const colWidth = CONTENT_WIDTH / 2 - 20;
    const signatureY = doc.y;

    this.renderSignatureBlock(doc, PAGE_MARGIN, signatureY, colWidth, 'Prepared by', [
      input.branding.companyName ?? '',
    ]);
    this.renderSignatureBlock(
      doc,
      PAGE_MARGIN + colWidth + 40,
      signatureY,
      colWidth,
      'Accepted by',
      [input.billToOrganization ?? input.billToName],
    );

    doc.y = signatureY + 90;
    doc.moveDown(3);

    const { branding } = input;
    const contactLines = [branding.phone, branding.email, branding.website].filter(Boolean);
    if (contactLines.length > 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(contactLines.join('  •  '), PAGE_MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
    }
    const addressParts = [
      branding.addressLine1,
      branding.addressLine2,
      [branding.city, branding.state, branding.postalCode].filter(Boolean).join(', '),
      branding.country,
    ].filter(Boolean);
    if (addressParts.length > 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(addressParts.join(' — '), PAGE_MARGIN, doc.y + 2, {
          width: CONTENT_WIDTH,
          align: 'center',
        });
    }
  }

  private renderSignatureBlock(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    lines: string[],
  ): void {
    doc
      .moveTo(x, y + 40)
      .lineTo(x + width, y + 40)
      .strokeColor(RULE)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(INK)
      .text(label, x, y + 46, { width });
    for (const line of lines.filter(Boolean)) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(line, x, doc.y + 2, { width });
    }
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text('Date: _______________', x, doc.y + 10, {
        width,
      });
  }

  private renderPageHeading(doc: PDFKit.PDFDocument, title: string, withRule = true): void {
    doc.font('Helvetica-Bold').fontSize(16).fillColor(INK).text(title, PAGE_MARGIN, doc.y);
    if (withRule) {
      const ruleY = doc.y + 6;
      doc
        .moveTo(PAGE_MARGIN, ruleY)
        .lineTo(PAGE_MARGIN + CONTENT_WIDTH, ruleY)
        .strokeColor(ACCENT)
        .lineWidth(1.5)
        .stroke();
      doc.y = ruleY + 14;
    } else {
      doc.moveDown(0.4);
    }
  }

  // `bufferPages: true` (constructor option above) is what makes this
  // possible — pdfkit normally streams each page out as soon as the next
  // `addPage()` is called, too early to know the final page count for a
  // "Page X of Y" footer; buffering defers flushing until `doc.end()`,
  // which is called only after this loop runs.
  private applyFooters(doc: PDFKit.PDFDocument, companyName: string | null): void {
    const range = doc.bufferedPageRange();
    // A footer sits inside the page's bottom margin by definition — but
    // pdfkit treats any `text()` write past `page.height - margins.bottom`
    // as overflow and silently `addPage()`s to hold it, which (since this
    // runs inside a `switchToPage` loop) appended a phantom blank page
    // after every real one. Zeroing the bottom margin for the duration of
    // each footer write is the standard pdfkit workaround: it removes the
    // boundary that triggers auto-pagination, without touching layout
    // anywhere else (every other page's content is already flowed before
    // this loop ever runs).
    const bottomMargin = doc.page.margins.bottom;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - PAGE_MARGIN + 10;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(companyName ?? '', PAGE_MARGIN, footerY, { width: CONTENT_WIDTH / 2, align: 'left' })
        .text(`Page ${i + 1} of ${range.count}`, PAGE_MARGIN + CONTENT_WIDTH / 2, footerY, {
          width: CONTENT_WIDTH / 2,
          align: 'right',
        });
      doc.page.margins.bottom = bottomMargin;
    }
  }
}
