import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface BusinessDocumentLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface BusinessDocumentInput {
  documentLabel: string;
  documentNumber: string;
  issuedDate: Date | null;
  validUntilOrDueDate: Date | null;
  validUntilOrDueLabel: string;
  billToName: string;
  billToEmail: string | null;
  currency: string;
  lineItems: BusinessDocumentLineItem[];
  subtotalAmount: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  notes: string | null;
}

// New infra folder (Phase 7, Enterprise CRM/Project-Management), same
// convention as email/ and storage/ — a plain, framework-agnostic
// service, not tied to any one caller. `pdfkit` (imperative, no React/
// JSX) was chosen over the plan's original `@react-pdf/renderer` pick:
// this backend has zero React/JSX anywhere, and pdfkit avoids
// introducing that just for PDF generation — see this phase's own
// report for the full reasoning. One shared `render()` covers both
// Quotation (this phase) and Invoice (Phase 5) — both are
// "line items + totals + a bill-to party" documents with no real
// structural difference, so one renderer parameterized by
// `documentLabel`/`validUntilOrDueLabel` avoids a near-duplicate
// service per document type.
@Injectable()
export class DocumentPdfService {
  render(input: BusinessDocumentInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(input.documentLabel, { align: 'left' });
      doc.moveDown(0.25);
      doc.fontSize(10).fillColor('#555555').text(`No. ${input.documentNumber}`);
      doc.fillColor('#000000');
      doc.moveDown(1);

      doc.fontSize(11).text(`Bill to: ${input.billToName}`);
      if (input.billToEmail) {
        doc.fontSize(10).fillColor('#555555').text(input.billToEmail);
        doc.fillColor('#000000');
      }
      doc.moveDown(0.5);

      if (input.issuedDate) {
        doc.fontSize(10).text(`Issued: ${input.issuedDate.toLocaleDateString()}`);
      }
      if (input.validUntilOrDueDate) {
        doc
          .fontSize(10)
          .text(`${input.validUntilOrDueLabel}: ${input.validUntilOrDueDate.toLocaleDateString()}`);
      }
      doc.moveDown(1);

      const tableTop = doc.y;
      const columns = { description: 50, quantity: 300, unitPrice: 380, amount: 470 };
      doc
        .fontSize(10)
        .text('Description', columns.description, tableTop)
        .text('Qty', columns.quantity, tableTop)
        .text('Unit price', columns.unitPrice, tableTop)
        .text('Amount', columns.amount, tableTop);
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .strokeColor('#cccccc')
        .stroke();

      let rowY = tableTop + 25;
      for (const item of input.lineItems) {
        doc
          .fontSize(10)
          .text(item.description, columns.description, rowY, { width: 240 })
          .text(item.quantity, columns.quantity, rowY)
          .text(`${input.currency} ${item.unitPrice}`, columns.unitPrice, rowY)
          .text(`${input.currency} ${item.amount}`, columns.amount, rowY);
        rowY += 20;
      }

      doc
        .moveTo(50, rowY + 5)
        .lineTo(545, rowY + 5)
        .strokeColor('#cccccc')
        .stroke();
      rowY += 15;

      const totalsRow = (label: string, value: string) => {
        doc.fontSize(10).text(label, columns.unitPrice, rowY).text(value, columns.amount, rowY);
        rowY += 18;
      };
      totalsRow('Subtotal', `${input.currency} ${input.subtotalAmount}`);
      if (Number(input.discountAmount) > 0) {
        totalsRow('Discount', `-${input.currency} ${input.discountAmount}`);
      }
      totalsRow('Tax', `${input.currency} ${input.taxAmount}`);
      doc.fontSize(11).text('Total', columns.unitPrice, rowY, { continued: false });
      doc.fontSize(11).text(`${input.currency} ${input.totalAmount}`, columns.amount, rowY);
      rowY += 30;

      if (input.notes) {
        doc.fontSize(10).fillColor('#555555').text('Notes', 50, rowY);
        doc.fontSize(10).text(input.notes, 50, rowY + 15, { width: 495 });
        doc.fillColor('#000000');
      }

      doc.end();
    });
  }
}
