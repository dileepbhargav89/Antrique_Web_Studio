# Interfaces

Placeholder — no interface exists yet in this reference module.
Interfaces here are behavioral contracts (methods — see `types/` for
plain data shapes), used only when a provider genuinely needs a swap
point, mirroring `apps/api/src/logging/`'s `Logger`/`AuditLogger`
pattern: define the interface, bind a concrete class to a `Symbol`
token, inject the token everywhere else. Most domain services (like
`../example-domain.service.ts`) are injected by concrete class
directly — add an interface + token only when a real second
implementation is expected, not speculatively.

Full convention: docs/architecture/domain-module-guide.md.
