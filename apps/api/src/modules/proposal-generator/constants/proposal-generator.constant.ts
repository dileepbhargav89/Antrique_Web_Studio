// Flat top-level route, same convention every prior module follows.
export const PROPOSAL_GENERATOR_ROUTE = 'proposal-generator';

// The prompt library key this module always renders — see
// prisma/seed.ts's PROMPT_TEMPLATES. Not user-configurable: this module
// exists specifically to drive this one template, matching Step 14's
// "clear separation between Prompts and Business workflows" (the
// template is data, owned by the Prompt Library; which template this
// FEATURE uses is a business-workflow decision, owned here).
export const PROPOSAL_GENERATION_TEMPLATE_KEY = 'proposal-generation-v1';
