// The controller's route segment — the one place this string is written,
// so @Controller() and anything that needs to reference the route (tests,
// docs) never risk drifting from each other. See
// docs/architecture/domain-module-guide.md "Constants organization" for
// when a value belongs here vs. inline.
export const EXAMPLE_DOMAIN_ROUTE = 'example';
