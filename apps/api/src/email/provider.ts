/**
 * Email provider interface — spec §14.3: "Sending sits behind a provider interface with the
 * transport injected from configuration." Provider choice is explicitly deferred (D6); this
 * interface is the seam a real provider (Postmark, SES, Resend, whatever gets picked) plugs
 * into later without touching any of the call sites in email.routes.ts.
 */
export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
  attachment?: { filename: string; content: Buffer; contentType: string };
}

export interface SendResult {
  status: 'sent' | 'queued' | 'failed';
  providerMessageId: string | null;
  error: string | null;
}

export interface EmailTransport {
  send(message: OutgoingEmail): Promise<SendResult>;
}
