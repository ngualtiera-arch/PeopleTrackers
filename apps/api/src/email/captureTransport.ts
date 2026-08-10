import { randomUUID } from 'node:crypto';
import type { EmailTransport, OutgoingEmail, SendResult } from './provider.js';

/**
 * §14.3: "Non-production uses a capture/preview transport, so the whole flow — compose,
 * confirm, attach, record — is fully testable without a live provider." Does not send
 * anywhere; the full message is already captured in email_log by the caller (to/subject/body
 * columns), so this just simulates a successful send and logs to the console for visibility
 * during development. Swap for a real EmailTransport implementation once a provider (D6) and
 * its credentials are configured — see §14.3/§22 deployment configuration.
 */
export class CaptureEmailTransport implements EmailTransport {
  async send(message: OutgoingEmail): Promise<SendResult> {
    console.log('[email:capture]', {
      to: message.to,
      subject: message.subject,
      bodyPreview: message.body.slice(0, 200),
      hasAttachment: Boolean(message.attachment),
    });
    return {
      status: 'sent',
      providerMessageId: `capture-${randomUUID()}`,
      error: null,
    };
  }
}
