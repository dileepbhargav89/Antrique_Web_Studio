# Design tokens + global styles

- `tokens/tokens.css` — all color/typography-family/spacing/shadow/blur/
  opacity/z-index/motion custom properties (`:root` + `.dark`). The "warm
  antique" palette (charcoal/ink primary, brass/amber accent) — see
  `docs/architecture/design-system.md` for the full token reference and
  verified WCAG contrast ratios.
- `tokens/components.css` — the few things Tailwind utilities can't
  express directly (selection color, scrollbar styling). Stays small by
  design.

Both are `@import`ed by `app/globals.css`, which also declares the
`@theme inline` block mapping these tokens into Tailwind's utility
namespace (`bg-primary`, `shadow-md`, etc.) — see that file's comments.
