// Phase 10, Module 4 (Authentication & Session Security) — "MFA
// extension points." A documented no-op, not real MFA: this app has no
// TOTP secret storage, no enrollment flow, and no `User` schema support
// for a second factor — standing that up is its own product decision
// (which factor: TOTP/SMS/WebAuthn, enrollment UX, recovery codes)
// outside this module's scope, same reasoning
// `utils/malware-scan.util.ts` (Module 3) already documents for its own
// extension point.
//
// What's real: `AuthService.login()` already calls this, in the right
// place (after password verification succeeds, before any token is
// issued) — wiring real MFA later means implementing this one
// function's body (verify a submitted TOTP code / WebAuthn assertion
// against the user's enrolled factor, throw on failure) and adding the
// submitted code to `LoginRequestDto`, not finding and adding a new
// call site.
export async function verifyMfaIfEnrolled(_userId: string): Promise<void> {
  return Promise.resolve();
}
