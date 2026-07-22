# Entities

Placeholder — no entity exists yet in this reference module (a ping
endpoint has no domain data to model). Entities are plain classes/
interfaces representing a business concept — a `Client`, an `Invoice` —
distinct from both the Prisma model (persistence shape) and any DTO
(wire shape). A real domain module populates this folder once it has
real data; entities are built from persistence models via `mappers/`,
never returned directly from a controller.

Full convention: docs/architecture/domain-module-guide.md.
