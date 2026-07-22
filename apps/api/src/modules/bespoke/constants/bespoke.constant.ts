// Route segments, matching modules/catalog/constants/catalog.constant.ts's
// existing "one string, one place" convention.
export const FABRIC_ROUTE = 'fabrics';
export const MEASUREMENT_PROFILE_ROUTE = 'measurement-profiles';
export const STYLE_OPTION_ROUTE = 'style-options';
export const PRODUCT_CUSTOMIZATION_ROUTE = 'product-customizations';

// Same slug pattern as catalog.constant.ts — redeclared here rather than
// imported from the catalog module, so this module has no file-level
// dependency on catalog's internals beyond the one deliberate
// ProductRepository import (see bespoke.module.ts) — "Zero circular
// dependencies" (this milestone's own requirement) is easiest to keep
// true when the coupling surface stays as small as possible.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_PATTERN_MESSAGE =
  'slug must be lowercase letters, numbers, and single hyphens between words (e.g. "navy-wool-twill")';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as
// catalog.constant.ts's own *_SORT_FIELDS.
export const FABRIC_SORT_FIELDS = ['name', 'createdAt', 'sortOrder'] as const;
export const MEASUREMENT_PROFILE_SORT_FIELDS = ['name', 'createdAt'] as const;
export const STYLE_OPTION_SORT_FIELDS = ['name', 'createdAt', 'sortOrder'] as const;
export const PRODUCT_CUSTOMIZATION_SORT_FIELDS = ['createdAt'] as const;
