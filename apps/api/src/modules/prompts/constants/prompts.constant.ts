// Flat top-level route, same "no module nests its routes under its own
// name" convention every prior module follows (see crm.constant.ts).
export const PROMPT_TEMPLATE_ROUTE = 'prompt-templates';

export const PROMPT_TEMPLATE_SORT_FIELDS = ['createdAt', 'name', 'category'] as const;

// `{{variable}}` — simple, readable, and distinct from any real prompt
// content that happens to contain literal curly braces (JSON examples in
// a template body use `{ "key": "value" }`, single braces, never matched
// by this pattern).
export const PROMPT_VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
