# Interfaces

Placeholder — no interface exists yet. `AuthService` has exactly one
implementation with no genuine swap point (no JWT strategy, no Passport,
no alternate credential provider — all explicitly out of scope this
phase). Add an interface only once a real second implementation is
expected, mirroring `apps/api/src/logging/`'s `Logger`/`AuditLogger`
pattern — not speculatively for a strategy that doesn't exist yet.

Full convention: docs/architecture/domain-module-guide.md.
