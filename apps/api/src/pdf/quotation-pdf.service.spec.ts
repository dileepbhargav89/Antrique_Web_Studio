import { QuotationPdfService, QuotationPdfInput } from './quotation-pdf.service';

function createInput(overrides: Partial<QuotationPdfInput> = {}): QuotationPdfInput {
  return {
    quotationNumber: 'Q-2026-00001',
    issuedDate: new Date('2026-01-01'),
    validUntil: new Date('2026-02-01'),
    currency: 'INR',
    billToName: 'Jordan Rivera',
    billToOrganization: 'Rivera Furniture Co.',
    billToEmail: 'jordan@example.com',
    lineItems: [
      { description: 'Website build', quantity: '1', unitPrice: '1000.00', amount: '1000.00' },
      {
        description:
          'A very long line item description that should wrap across multiple lines '.repeat(3),
        quantity: '2',
        unitPrice: '50.00',
        amount: '100.00',
      },
    ],
    subtotalAmount: '1100.00',
    taxAmount: '110.00',
    discountAmount: '50.00',
    totalAmount: '1160.00',
    notes: 'Please review and let us know if you have questions.',
    paymentStages: [
      {
        label: 'Advance Payment',
        triggerNote: 'Due on acceptance of this proposal',
        percentage: '40.00',
        amount: '464.00',
      },
      {
        label: 'Milestone Payment',
        triggerNote: 'Due on completion of the development milestone',
        percentage: '40.00',
        amount: '464.00',
      },
      {
        label: 'Final Payment',
        triggerNote: 'Due prior to final delivery & handover',
        percentage: '20.00',
        amount: '232.00',
      },
    ],
    branding: {
      companyName: 'Antrique Web Studio',
      tagline: 'Web software, made predictable.',
      addressLine1: '123 Studio Lane',
      addressLine2: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
      phone: '+91 98765 43210',
      email: 'hello@antrique.dev',
      website: 'https://antrique.dev',
      taxId: 'GSTIN1234567890',
      bankDetails: 'Account: 000123456789 — IFSC: EXAM0001234',
      logoBuffer: null,
    },
    ...overrides,
  };
}

describe('QuotationPdfService', () => {
  const service = new QuotationPdfService();

  it('renders a valid multi-page PDF buffer from a full quotation input', async () => {
    const buffer = await service.render(createInput());

    expect(buffer.length).toBeGreaterThan(0);
    // PDF magic bytes — a real, well-formed document, not an empty stream.
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.toString('latin1')).toContain('%%EOF');
  });

  it('renders without throwing when branding/notes/logo are all absent', async () => {
    const input = createInput({
      notes: null,
      branding: {
        companyName: null,
        tagline: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        state: null,
        postalCode: null,
        country: null,
        phone: null,
        email: null,
        website: null,
        taxId: null,
        bankDetails: null,
        logoBuffer: null,
      },
    });

    const buffer = await service.render(input);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders without throwing when the logo bytes are malformed (not a real image)', async () => {
    const input = createInput({
      branding: { ...createInput().branding, logoBuffer: Buffer.from('not-an-image') },
    });

    const buffer = await service.render(input);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders cleanly with an empty payment-stage list', async () => {
    const buffer = await service.render(createInput({ paymentStages: [] }));

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
