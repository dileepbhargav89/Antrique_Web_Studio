# Entities

Placeholder — no entity exists yet. `login()`/`refresh()`/`logout()` are
placeholders themselves (see `../auth.service.ts`) with no real user
data flowing through them yet; `AuthRepository`'s inherited `findMany()`
call in `login()` is unused beyond proving the DI chain works. An entity
here would represent an authenticated-user concept distinct from
Prisma's `User` model and any DTO — add one once a real implementation
needs to shape that data internally.

Full convention: docs/architecture/domain-module-guide.md.
