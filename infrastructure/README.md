# Infrastructure as code and deployment configuration

- `docker/` — **real.** `api.Dockerfile`/`web.Dockerfile` are production
  multi-stage builds (hardened Milestone 14); see `docker/README.md`.
- `terraform/`, `k8s/`, `observability/` — placeholders only, no
  implementation. Provisioning/orchestration/monitoring today is
  Docker Compose (`docker-compose.yml`/`docker-compose.prod.yml` at the
  repo root) — see `docs/architecture/{deployment,container,operations}.md`.
