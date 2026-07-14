# Security Architecture

Defense in depth — no single control trusted alone. Highest redundancy on the two
existential properties: multi-tenant isolation and the credential/payment boundary.

## Layers
Edge (WAF/DDoS/TLS/rate-limit/CORS) → Application (authn/authz/JWT/RBAC/validation/
encoding/CSRF/XSS defense/parameterized queries/upload safety) → Data (encryption
at rest+transit, RLS, least-privilege roles, secrets vault) → Operations (logging/
monitoring/backups/DR).

## Controls
- **Auth:** managed IdP, MFA (enforced for Admin), SSO/SAML, short sessions.
- **Authz:** RBAC action gate + RLS row gate, both server-side; step-up for
  sensitive; 401/403/404 discipline.
- **JWT:** short-lived access + rotating refresh (reuse detection), verified every
  request, HTTP-only cookies, minimal claims, keys in vault.
- **RBAC:** relational, per-tenant roles, least privilege, grants audited.
- **Rate limiting:** tiered by risk, protects auth endpoints.
- **CSRF:** SameSite cookies + anti-CSRF token on mutations; bearer clients immune.
- **CORS:** allowlist only, never wildcard-with-credentials.
- **XSS:** output encoding + strict CSP + input sanitization + HTTP-only cookies
  (3 independent barriers).
- **SQLi:** parameterized queries only + boundary validation + least-privilege
  roles + RLS backstop.
- **File upload:** direct-to-storage pre-signed, type/size allowlist, virus scan
  (quarantine on fail), private buckets/tenant keys, content-type enforced.
- **Backups:** managed PITR, encrypted, tested restores documented.
- **Secrets:** vault/KMS, never in code/repo, rotated, UI never shows plaintext.
- **Logging:** structured, no secrets/PII, immutable audit trail.
- **Monitoring:** anomaly alerts (failed logins, authz denials, rate-limit),
  synthetic checks, CVE scanning, periodic pen-test of the tenant boundary.
- **DR:** IaC rebuild, replica + PITR, RPO/RTO targets, rehearsed drills.
