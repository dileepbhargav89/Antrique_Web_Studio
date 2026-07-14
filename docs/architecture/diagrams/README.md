# Architecture Diagrams

Rendered during design (interactive in-chat). Recreate from the specs in the
adjacent architecture docs. The set:

- C4 system context — users + third-party services around the platform
- C4 container — edge, two frontends, backend, data stores
- C4 component — the six backend modules + cross-cutting layer
- Quote submission sequence — conversion path (async email)
- Payment sequence — hosted-gateway handoff, webhook-driven
- Deployment topology — India region, autoscaling, DR replica, observability
- CI/CD pipeline — PR gates → staging → canary → blue-green
- Data ERD — tenant-isolated entities + RBAC cluster
- Auth sequence — OIDC, rotating refresh, step-up
- RBAC resolution — action gate (RBAC) + row gate (RLS)
