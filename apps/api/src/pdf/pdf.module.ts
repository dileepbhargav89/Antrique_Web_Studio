import { Global, Module } from '@nestjs/common';
import { DocumentPdfService } from './document-pdf.service';
import { QuotationPdfService } from './quotation-pdf.service';

// @Global(), same precedent as EmailModule/StorageModule — infrastructure
// framed as app-wide from its first real consumer rather than scoped to
// one module. `DocumentPdfService` now serves Invoice only —
// `QuotationPdfService` (this phase's professional-letterhead redesign)
// is a separate renderer, not a parameterization of the same one; see
// that file's own header comment for why they diverged.
@Global()
@Module({
  providers: [DocumentPdfService, QuotationPdfService],
  exports: [DocumentPdfService, QuotationPdfService],
})
export class PdfModule {}
