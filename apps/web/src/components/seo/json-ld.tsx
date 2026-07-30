export interface JsonLdProps {
  data: object;
}

/**
 * One `<script type="application/ld+json">` per schema builder in
 * `lib/seo/schema.ts`. Renders exactly the object a builder returns — per
 * that file's own header comment, structured data must be generated from
 * the same content the page renders, never a separately-maintained copy.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    // eslint-disable-next-line react/no-danger -- JSON-LD has no other valid injection point
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
