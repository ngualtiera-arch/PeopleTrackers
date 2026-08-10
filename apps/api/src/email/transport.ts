import { CaptureEmailTransport } from './captureTransport.js';
import type { EmailTransport } from './provider.js';

// Provider choice deferred (D6) — capture transport is the only implementation until a real
// provider is configured at deployment. Swap this one line once that happens.
export const emailTransport: EmailTransport = new CaptureEmailTransport();
