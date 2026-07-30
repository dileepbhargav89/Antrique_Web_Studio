export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string; // ISO date
  author: string;
  readTimeMinutes: number;
  tags: string[];
  body: string[]; // paragraphs
}

/**
 * Genuine, non-fabricated editorial content (no invented client stories or
 * claims) — code-authored data, not a CMS yet (that's Sprint 6 scope, see
 * docs/product/05-admin-dashboard.md's real content, despite the
 * filename). `generateStaticParams` for `blog/[slug]` reads straight from
 * this array.
 */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'why-website-speed-matters-for-conversion',
    title: 'Why Website Speed Matters for Conversion',
    excerpt:
      'A slow site doesn’t just frustrate visitors — it quietly costs revenue before anyone fills out a form. Here’s what actually moves the needle.',
    publishedAt: '2026-06-02',
    author: 'Antrique Web Studio',
    readTimeMinutes: 5,
    tags: ['Performance', 'Conversion'],
    body: [
      'Every additional second a page takes to become interactive is a second a visitor spends deciding whether to leave. Speed isn’t a vanity metric measured for its own sake — it directly shapes whether someone sticks around long enough to trust you with a form, a cart, or a phone call.',
      'The biggest wins rarely come from exotic optimizations. They come from the basics done consistently: shipping less JavaScript than the page actually needs, serving images at the size they’re displayed (not the size they were uploaded), and deferring anything that isn’t needed for the first meaningful paint.',
      'Core Web Vitals — Largest Contentful Paint, Interaction to Next Paint, and Cumulative Layout Shift — exist because they correlate with what users actually feel: does the page look ready, does it respond when I tap something, and does the layout stay still while I’m reading it. Optimizing for the metric and optimizing for the experience turn out to be the same exercise.',
      'In practice, this means route-level code splitting so a visitor never downloads code for a page they haven’t navigated to yet, reserving layout space for images and video before they load so nothing jumps around, and being deliberate about what runs on the client at all — a server-rendered page that ships less JavaScript is often faster than a client-rendered one that ships more, no matter how clever the client-side code is.',
      'None of this is a one-time project. Performance regresses quietly as a codebase grows unless it’s treated as a standing constraint, not a launch-week checklist item.',
    ],
  },
  {
    slug: 'founders-guide-choosing-web-development-partner',
    title: 'A Founder’s Guide to Choosing a Web Development Partner',
    excerpt:
      'The difference between a good engagement and a painful one usually shows up long before any code is written.',
    publishedAt: '2026-06-16',
    author: 'Antrique Web Studio',
    readTimeMinutes: 6,
    tags: ['Process', 'For Founders'],
    body: [
      'Most of the anxiety in a web project isn’t about code quality — it’s about visibility. Founders rarely complain that a feature was built poorly; they complain that they didn’t know what was happening for three weeks. The single best predictor of a good engagement is whether you can see real progress at any point, not just at the end.',
      'Ask any prospective partner how they handle the two moments that break most projects: the beginning, when requirements are still fuzzy, and the middle, when work is happening but nothing visible has shipped yet. A partner with a real answer for both — a structured discovery process, and a cadence of staging previews or milestone check-ins — is telling you something concrete about how the engagement will actually feel.',
      'Fixed-price-for-everything and pure time-and-materials both have failure modes: the former incentivizes cutting corners once the estimate is blown, the latter removes any incentive to be efficient. A scoped quote tied to clearly defined milestones, reviewed and approved by you at each stage, avoids both traps.',
      'Finally, ask what happens after launch. A site that isn’t maintained degrades — dependencies go stale, content goes out of date, and the first real security patch that needs applying often doesn’t get applied. A partner who treats launch as the finish line is optimizing for a different outcome than a partner who treats it as the start of a maintenance relationship.',
    ],
  },
  {
    slug: 'web-accessibility-basics-wcag-aa',
    title: 'Web Accessibility Basics: What WCAG AA Means for Your Business',
    excerpt:
      'Accessibility compliance is often treated as a legal checkbox. It’s also just good product design — for everyone.',
    publishedAt: '2026-07-07',
    author: 'Antrique Web Studio',
    readTimeMinutes: 4,
    tags: ['Accessibility'],
    body: [
      'WCAG 2.1 AA is the most widely referenced accessibility standard, and increasingly the baseline expected by regulators, procurement teams, and users alike. It covers four broad principles: content must be perceivable, interface elements must be operable, information must be understandable, and the implementation must be robust enough to work with assistive technology.',
      'In practice, this means sufficient color contrast between text and its background, every interactive element reachable and operable by keyboard alone (not just mouse or touch), form fields with real associated labels rather than placeholder text standing in for them, and a heading structure that actually describes the page’s outline rather than being chosen for font size.',
      'A useful reframe: most accessibility fixes improve the experience for every user, not just those using assistive technology. Real keyboard navigation helps power users move faster. Sufficient contrast helps anyone reading on a phone in direct sunlight. Clear form error messages help everyone recover from a mistake instead of guessing what went wrong.',
      'Accessibility is easiest and cheapest when it’s a constraint from the first design file, not a remediation pass after launch — retrofitting a non-semantic, div-soup interface into something screen-reader-usable is dramatically more expensive than building it correctly the first time.',
    ],
  },
];
