import { ContentDraftType } from '../../../../generated/prisma/enums';

export const CONTENT_ASSISTANT_ROUTE = 'content-assistant';

// Same "this module always drives this one prompt-library template"
// reasoning as proposal-generator.constant.ts's own comment — the
// `{{contentType}}` variable is what varies per request, not the
// template itself.
export const CONTENT_GENERATION_TEMPLATE_KEY = 'content-generation-v1';

export const CONTENT_DRAFT_SORT_FIELDS = ['createdAt', 'type'] as const;

// Human-readable form of each `ContentDraftType` value for the template's
// `{{contentType}}` variable — the model writes a better result from
// "Write a case study..." than "Write a CASE_STUDY...".
export const CONTENT_TYPE_LABELS: Record<ContentDraftType, string> = {
  CASE_STUDY: 'case study',
  SERVICE_DESCRIPTION: 'service description',
  BLOG_DRAFT: 'blog post draft',
  FAQ: 'FAQ section',
  LANDING_PAGE: 'landing page',
  SOCIAL_POST: 'social media post',
};
