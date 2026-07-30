export const REQUIREMENT_ANALYZER_ROUTE = 'requirement-analyzer';

// Same "this module always drives this one prompt-library template"
// reasoning as proposal-generator.constant.ts's own comment.
export const REQUIREMENT_ANALYSIS_TEMPLATE_KEY = 'requirement-analysis-v1';

export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt'] as const;

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

// A guard against blowing the AI request past its token limit on a huge
// document — not a hard product requirement, a pragmatic ceiling. Real
// documents this feature targets (requirement briefs) are nowhere near
// this size; a document that hits it gets analyzed on its first ~40k
// characters with `truncated: true` on the response, not silently
// dropped or hard-rejected.
export const MAX_DOCUMENT_TEXT_CHARS = 40000;
