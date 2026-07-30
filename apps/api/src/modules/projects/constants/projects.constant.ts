// Flat top-level routes, same "no module nests its routes under its own
// name" convention every prior module follows (see crm.constant.ts).
export const PROJECT_ROUTE = 'projects';
export const MILESTONE_ROUTE = 'milestones';
export const TASK_ROUTE = 'tasks';
// Document has no XOR ambiguity (belongs to exactly one project) — nested
// under PROJECT_ROUTE as `:id/documents`, mirroring
// ProductImageController's own `:id/images` shape, not a flat route.
export const COMMENT_ROUTE = 'comments';

export const PROJECT_SORT_FIELDS = ['createdAt', 'name', 'status'] as const;
export const MILESTONE_SORT_FIELDS = ['createdAt', 'dueDate', 'status'] as const;
export const TASK_SORT_FIELDS = ['createdAt', 'dueDate', 'status', 'priority'] as const;
export const DOCUMENT_SORT_FIELDS = ['createdAt', 'filename'] as const;
export const COMMENT_SORT_FIELDS = ['createdAt'] as const;

// ARCHIVED is reached only via the dedicated `POST /projects/:id/archive`
// action (gated by `projects:delete`, stricter than `projects:write`),
// mirroring Lead's own Update-vs-Archive split — not a value the general
// `PATCH /projects/:id` route accepts.
export const PROJECT_UPDATABLE_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'IN_REVIEW',
  'LAUNCHED',
  'MAINTENANCE',
] as const;
