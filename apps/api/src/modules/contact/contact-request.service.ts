import { Inject, Injectable } from '@nestjs/common';
import { ContactRequestRepository } from './repositories/contact-request.repository';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';
import { toContactRequestResponseDto } from './mappers/contact-request.mapper';
import { CONTACT_REQUEST_SOURCE } from './constants/contact.constant';
import { JobRunner } from '../../jobs';
import { SendEmailJob } from '../../email';
import { LOGGER, Logger } from '../../logging';
import { escapeHtml } from '../../utils/html.util';

// Business logic + fire-and-forget confirmation email. No list/get/update
// route exists this phase (see this module's own README) — `createdBy`/
// `updatedBy` are left unset for the same reason category.service.ts's
// own header comment documents (no user identifier exists in the request
// pipeline for a route that isn't even authenticated here).
@Injectable()
export class ContactRequestService {
  constructor(
    private readonly contactRequestRepository: ContactRequestRepository,
    private readonly jobRunner: JobRunner,
    private readonly sendEmailJob: SendEmailJob,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async create(dto: CreateContactRequestDto, tenantId: string): Promise<ContactRequestResponseDto> {
    const contactRequest = await this.contactRequestRepository.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        company: dto.company,
        message: dto.message,
        source: CONTACT_REQUEST_SOURCE,
      },
    });

    // Fire-and-forget — never awaited in the request path (see
    // email/README.md's own comment on SendEmailJob): a slow or down
    // email provider must never delay or fail this response. JobRunner's
    // own run() doesn't reject on failure (it resolves 'dead_letter'
    // after exhausting retries), so the real failure signal is the
    // resolved result's status, not a caught rejection — the `.catch()`
    // below is defensive only, in case that internal contract ever
    // changes.
    void this.jobRunner
      .run(this.sendEmailJob, {
        to: contactRequest.email,
        subject: 'We received your message',
        html:
          `<p>Hi ${escapeHtml(contactRequest.name)},</p>` +
          '<p>Thanks for reaching out — we’ll get back to you within one business day.</p>',
      })
      .then((result) => {
        if (result.status === 'dead_letter') {
          this.logger.error('Contact request confirmation email exhausted retries', {
            contactRequestId: contactRequest.id,
            error: result.error,
          });
        }
      })
      .catch((error) => {
        this.logger.error('Contact request confirmation email job threw unexpectedly', {
          contactRequestId: contactRequest.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return toContactRequestResponseDto(contactRequest);
  }
}
