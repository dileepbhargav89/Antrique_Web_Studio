import { BadRequestException } from '@nestjs/common';
import { DocumentTextExtractor } from './document-text-extractor';

const mockGetText = jest.fn(async () => ({ text: 'extracted pdf text' }));
const mockDestroy = jest.fn(async () => undefined);

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy,
  })),
}));

jest.mock('mammoth', () => ({
  extractRawText: jest.fn(async () => ({ value: 'extracted docx text' })),
}));

describe('DocumentTextExtractor', () => {
  const extractor = new DocumentTextExtractor();

  it('reads .txt files as plain UTF-8 text', async () => {
    const result = await extractor.extract(Buffer.from('hello world'), 'brief.txt');

    expect(result).toBe('hello world');
  });

  it('reads .md files as plain UTF-8 text', async () => {
    const result = await extractor.extract(Buffer.from('# Heading'), 'brief.md');

    expect(result).toBe('# Heading');
  });

  it('extracts .pdf text via pdf-parse and calls destroy()', async () => {
    const result = await extractor.extract(Buffer.from('fake-pdf-bytes'), 'brief.pdf');

    expect(result).toBe('extracted pdf text');
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('extracts .docx text via mammoth', async () => {
    const result = await extractor.extract(Buffer.from('fake-docx-bytes'), 'brief.docx');

    expect(result).toBe('extracted docx text');
  });

  it('is case-insensitive on the extension', async () => {
    const result = await extractor.extract(Buffer.from('hello'), 'BRIEF.TXT');

    expect(result).toBe('hello');
  });

  it('rejects unsupported file types', async () => {
    await expect(extractor.extract(Buffer.from('data'), 'brief.exe')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects files with no extension', async () => {
    await expect(extractor.extract(Buffer.from('data'), 'brief')).rejects.toThrow(
      BadRequestException,
    );
  });
});
