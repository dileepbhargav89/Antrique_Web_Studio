# CI/CD Pipeline

New this pass (Engineering Polish — pre-Backend-v1.0-review). The
authoritative reference for `.github/workflows/ci.yml` — what runs, in
what order, what gates a merge, and what's still a template pending real
hosting infrastructure (`deploy-staging.yml`/`deploy-production.yml` —
covered separately below).

## 1. Trigger

`push`/`pull_request` targeting `main`. `concurrency` cancels an
in-progress run when a newer push lands on the same ref — no point
finishing a CI run for a commit that's already been superseded.

## 2. Pipeline stages (jobs)

Six independent jobs, most running in parallel (GitHub Actions runs jobs
concurrently by default unless a `needs:` dependency says otherwise —
only `release-artifacts` has one):

| Job | Purpose | Own service container? | Depends on |
|---|---|---|---|
| `lint-typecheck-test-build` | Lint, typecheck, the full unit test suite, production build, format check | No — every existing test mocks its own repositories | — |
| `migration-validation` | Apply every committed Prisma migration to a clean database, confirm no drift | Postgres | — |
| `openapi-generation` | Boot the real app, generate `openapi.json` from it | Postgres | — |
| `dependency-audit` | `pnpm audit`, gated against the documented allowlist | No | — |
| `docker-build` | Build the `runtime` image; Trivy container security scan | No (Docker daemon, provided by the runner) | — |
| `release-artifacts` | Bundle the build + OpenAPI spec + version metadata into one archive | No | `lint-typecheck-test-build`, `openapi-generation` |

Every job runs on a fresh `ubuntu-latest` runner — no job shares state
with another except via explicit `actions/upload-artifact`/
`actions/download-artifact` (used by `release-artifacts` to pull in the
other two jobs' outputs).

## 3. Execution order

Parallel by default is a deliberate choice, not an oversight: these five
independent jobs (`lint-typecheck-test-build`, `migration-validation`,
`openapi-generation`, `dependency-audit`, `docker-build`) check unrelated
things and don't need each other's output — running them serially would
only slow down feedback with no correctness benefit. `release-artifacts`
is the one job with a real data dependency (it needs the OTHER jobs'
actual output files), so it alone waits.

## 4. Quality gates (what actually blocks a merge)

Every job above must succeed for the workflow as a whole to report green
— GitHub's own branch-protection rules (configured outside this repo, in
GitHub's own UI) are what would actually make this REQUIRED before
merging `main`; the workflow itself just reports pass/fail honestly. No
step anywhere uses `continue-on-error`/`|| true` to mask a failure — a
red step is always a red job.

- **Lint/typecheck/test/build/format** — the baseline correctness gate,
  unchanged in substance since before this pass.
- **Migration validation** — every migration must apply cleanly to a real
  Postgres. Catches the class of bug this project's own history shows is
  real (a migration that's syntactically valid but fails against real
  Postgres — see `decisions.md`'s "Phase 1 production-readiness audit").
- **OpenAPI generation** — must succeed for the app to even boot far
  enough to build a document; a DI-wiring regression that broke module
  bootstrap (independent of whether any test happens to catch it) fails
  here too, as a side effect.
- **Dependency audit** — must show zero UNDOCUMENTED findings. Already-
  reviewed findings (`apps/api/audit-allowlist.json`) never fail this;
  a genuinely new one does, immediately, in the same PR that introduced
  it.
- **Docker build + Trivy** — the image must build, and must carry no
  HIGH/CRITICAL vulnerability that isn't in `.trivyignore`.

## 5. Migration validation (detail)

Own Postgres service container (`postgres:16-alpine`, health-checked
before any step runs against it). `pnpm --filter @antrique/api
db:migrate:deploy` (== `prisma migrate deploy`) applies every migration
in `apps/api/prisma/migrations/` in order; `pnpm --filter @antrique/api
db:migrate` (== `prisma migrate status`) then confirms a clean,
fully-applied state with nothing pending. This is the ONLY CI job that
ever touches a real database — deliberately separate from the test suite,
which mocks every repository (see `container.md`/`deployment.md` for why
that split is correct, not a gap).

## 6. Docker build (detail)

Builds `infrastructure/docker/api.Dockerfile`'s `runtime` target with
`APP_VERSION`/`GIT_COMMIT_SHA` build args set to `github.sha` — see
`container.md` §1/§4. Never pushes anywhere (no registry configured yet).
Immediately followed by the Trivy scan (§8) against the same image, in the
same job, so no second build is needed.

## 7. OpenAPI generation (detail)

See `deployment.md`/`container.md` "OpenAPI artifact generation" and
`scripts/generate-openapi.ts`'s own header comment for the full mechanism.
CI-specific detail: its own Postgres service container (separate from
`migration-validation`'s — GitHub Actions jobs don't share a filesystem or
service across job boundaries, so reusing one isn't possible; spinning up
a second is cheap and keeps this job independently parallelizable),
migrations applied first (`db:migrate:deploy` — the app needs the real
schema to exist, though `PrismaService`'s own startup check only ever
runs `SELECT 1`, not a query against any app table), then `pnpm --filter
@antrique/api generate:openapi`, then the resulting `openapi.json`
uploaded as the `openapi-spec` artifact (30-day retention).

## 8. Security scanning (detail)

Two independent mechanisms, covered in full in `security.md` §15 and
`container.md` §10:
- **`dependency-audit` job** — `apps/api/scripts/check-audit-allowlist.js`
  against `apps/api/audit-allowlist.json`.
- **`docker-build` job's Trivy steps** — full report (informational) +
  gated HIGH/CRITICAL-only pass, against `.trivyignore`.

Both follow the same underlying discipline: presence of a finding in the
allowlist/ignore-file means "already triaged, confirmed unreachable or
accepted," never "we didn't look."

## 9. Artifact generation (detail)

| Artifact name | Job | Contents | Retention |
|---|---|---|---|
| `api-dist` | `lint-typecheck-test-build` | Compiled `apps/api/dist/` | 7 days |
| `openapi-spec` | `openapi-generation` | `openapi.json` | 30 days |
| `release-bundle` | `release-artifacts` | `dist/` + `openapi.json` + `release-metadata.json` (version/commit sha/build timestamp/run id/actor/ref) | 90 days |

`release-bundle` is the one to pull for anything beyond routine CI
inspection — see `release.md` "Release artifacts."

## 10. Release workflow

`ci.yml` never deploys anything — it validates and packages. Deploying is
`deploy-staging.yml`/`deploy-production.yml` (`workflow_dispatch`-only,
manual trigger, `action: deploy | rollback` input) — see `container.md`
§9 and `release.md` for the full checklist. Both currently build a real
Docker image and then hit a deliberate, clearly-labeled placeholder for
the actual push/rollout/health-verification steps (no registry or hosting
target is provisioned — `deployment.md` §7); see each workflow file's own
header comment for exactly what a real implementation would need to fill
in and which per-environment secrets (`STAGING_*`/`PRODUCTION_*`, scoped
via GitHub Environments) it would read.

## 11. Frontend developers — where to get the OpenAPI spec

Download the `openapi-spec` artifact from the most recent successful
`openapi-generation` job run on `main` (GitHub Actions UI → the workflow
run → Artifacts), or the `release-bundle` artifact for a specific
tagged/versioned build (includes the same file plus its exact version/
commit metadata — see `release.md`). Do not hand-maintain a local copy —
regenerate (`pnpm --filter @antrique/api generate:openapi`, needs a
reachable Postgres) or re-download whenever the backend changes; the
whole point of generating it from the real bootstrap is that a stale
manually-edited copy can never happen. `packages/api-contract/openapi/
openapi.yaml` remains the pre-implementation authoritative CONTRACT
(hand-authored, describes intended shape before code exists) — the
generated `openapi.json` is the as-BUILT reality; the two should converge
but serve different purposes.
