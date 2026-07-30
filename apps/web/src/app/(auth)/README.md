# (auth) route group

A route group, not a URL segment, so pages here render at `/login` etc.,
not `/auth/login`. Intentionally separate from `(portal)`: auth pages are
public/unauthenticated, unlike everything inside `(portal)`.

`layout.tsx` (centered card shell, redirects to `/dashboard` if already
authenticated), `error.tsx`/`loading.tsx`, and `login/` (real — email +
password, RHF/Zod, expired-session messaging) are all real. No signup or
password-reset pages — the real backend has no registration or
password-reset endpoints (`apps/api/src/modules/auth/README.md`'s own
"No registration, no password reset" scope note; not a gap this frontend
can fill without a new backend contract). See
`docs/architecture/application-runtime.md` §5 for the full auth flow.
