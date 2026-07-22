# Validators

Placeholder — no custom validator exists yet in this reference module (a
ping endpoint takes no input). A real domain module adds custom
`class-validator` decorators here only for validation rules the built-in
decorators (`@IsString()`, `@IsUUID()`, ...) can't express — e.g. a
cross-field rule or a domain-specific format. Applied directly on DTO
fields in `dto/`, not as a separate pipe, unless a rule is genuinely
reusable across multiple DTOs.

Full convention: docs/architecture/domain-module-guide.md.
