export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: 'How long does a typical project take?',
    answer:
      'It depends entirely on scope — a focused marketing site typically takes a few weeks; a custom application or platform takes longer. You get a realistic timeline as part of your quote, before any work begins.',
  },
  {
    question: 'Do you offer fixed pricing?',
    answer:
      'Every engagement gets a scoped quote after a short discovery conversation, not a one-size-fits-all price list — see our Pricing page for the tiers we typically work within.',
  },
  {
    question: 'Can you work with our existing brand and design?',
    answer:
      'Yes. We can design from scratch or build within an existing brand system, style guide, or design file.',
  },
  {
    question: 'Do you offer ongoing maintenance after launch?',
    answer:
      'Yes — maintenance and support retainers are available and recommended for anything beyond a static brochure site.',
  },
  {
    question: 'What industries do you work with?',
    answer:
      'We work across sectors — see our Industries page for the ones we focus on. If yours isn’t listed, get in touch anyway.',
  },
  {
    question: 'Is our data handled securely?',
    answer:
      'Security and tenant isolation are built into how we architect every platform, not bolted on afterward. We never handle raw payment card data directly — payments route through a hosted gateway.',
  },
  {
    question: 'Do you handle hosting and deployment?',
    answer:
      'Yes — we can deploy to your existing infrastructure or set up hosting as part of the engagement. Every deployment uses containerized, CI/CD-driven releases, not manual file uploads.',
  },
  {
    question: 'Can you integrate AI features into our product?',
    answer:
      "Yes. Products are architected so AI-assisted features — content generation, search, workflow automation — can be added without a rebuild, whether that's part of the initial build or a later phase.",
  },
  {
    question: 'What kind of support do you provide after launch?',
    answer:
      'Maintenance and support retainers cover monitoring, dependency updates, and direct access to the team when something needs attention — not just a ticket queue.',
  },
  {
    question: 'How do you approach performance?',
    answer:
      'Core Web Vitals and load-time budgets are reviewed as part of delivery, not treated as a post-launch cleanup item — see our Performance & Security Audits service for a deeper, standalone review.',
  },
];
