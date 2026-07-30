import { Global, Module } from '@nestjs/common';
import { DocumentPdfService } from './document-pdf.service';

// @Global(), same precedent as EmailModule/StorageModule — infrastructure
// framed as app-wide from its first real consumer (QuotationService, this
// phase) rather than scoped to one module, since Invoice (Phase 5) is
// already a known second consumer.
@Global()
@Module({
  providers: [DocumentPdfService],
  exports: [DocumentPdfService],
})
export class PdfModule {}
