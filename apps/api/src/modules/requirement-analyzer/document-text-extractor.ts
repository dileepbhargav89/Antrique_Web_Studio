import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { SUPPORTED_DOCUMENT_EXTENSIONS } from './constants/requirement-analyzer.constant';

// Isolated from RequirementAnalyzerService on purpose — the one place in
// this module that knows about `pdf-parse`/`mammoth`'s own APIs. A future
// consumer needing "extract text from an uploaded document" (there isn't
// one yet) would depend on this class, not re-implement per-format
// parsing.
@Injectable()
export class DocumentTextExtractor {
  async extract(buffer: Buffer, filename: string): Promise<string> {
    const extension = this.getExtension(filename);

    switch (extension) {
      case '.pdf':
        return this.extractPdf(buffer);
      case '.docx':
        return this.extractDocx(buffer);
      case '.md':
      case '.txt':
        return buffer.toString('utf-8');
      default:
        throw new BadRequestException(
          `Unsupported file type "${extension}" — only ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')} are supported`,
        );
    }
  }

  private getExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex === -1 ? '' : filename.slice(dotIndex).toLowerCase();
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    // pdf-parse v2's own API — a class, not the v1 default-export
    // function (`new PDFParse({data}).getText()`, not `pdf(buffer)`).
    // `destroy()` is required per the library's own docs to free the
    // underlying pdf.js worker resources.
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
