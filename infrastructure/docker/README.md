# Container image definitions per service

`api.Dockerfile` is real (multi-stage: `deps` → `dev`/`build` → `runtime`,
non-root `runtime` stage, `HEALTHCHECK` against the real `/health/live`
endpoint — hardened Milestone 14, see docs/architecture/deployment.md).
`web.Dockerfile` is real too (`apps/web`'s own Next.js standalone build) —
left unchanged by Milestone 14 (backend-only scope at the time) but given
the same non-root/`HEALTHCHECK` hardening in Phase 10, Module 11
(Docker/infra); see docs/architecture/deployment.md's own Module 11
section. `nginx.conf` is a local reverse-proxy template, not yet wired into
any compose file (see its own header comment). `worker.Dockerfile` remains
a genuine placeholder — no `apps/worker` exists yet.
