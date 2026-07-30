// Mirrors EmailService's own `SendEmailResult` union directly rather than
// declaring a second shape for the same three outcomes — 'skipped' is the
// honest "no email provider configured" no-op (see EmailService's own
// header comment), distinct from 'failed' (a real, configured provider
// call that errored).
export class SendEmailResponseDto {
  constructor(
    readonly status: 'sent' | 'skipped' | 'failed',
    readonly id?: string,
    readonly reason?: string,
    readonly error?: string,
  ) {}
}
