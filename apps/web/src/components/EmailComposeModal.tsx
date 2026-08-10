import { useEffect, useState } from 'react';

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailDefaults {
  recipient: string;
  subject: string;
  body: string;
}

/**
 * Compose → edit → confirm → send — §14.1/§14.2. Basic format validation shows a warning but
 * never blocks sending (D6/§2.6: "Downgraded to basic validation with a warning").
 */
export function EmailComposeModal({
  title,
  attachmentNote,
  loadDefaults,
  onSend,
  onClose,
}: {
  title: string;
  attachmentNote: string;
  loadDefaults: () => Promise<EmailDefaults>;
  onSend: (values: EmailDefaults) => Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<EmailDefaults>({ recipient: '', subject: '', body: '' });

  useEffect(() => {
    loadDefaults()
      .then(setValues)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load defaults.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recipientValid = values.recipient === '' || SIMPLE_EMAIL_RE.test(values.recipient.trim());

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await onSend(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-[32rem] rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">To</span>
              <input
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                value={values.recipient}
                onChange={(e) => setValues((v) => ({ ...v, recipient: e.target.value }))}
              />
              {!recipientValid && <span className="mt-1 block text-xs text-amber-600">This doesn't look like a valid email address.</span>}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Subject</span>
              <input
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                value={values.subject}
                onChange={(e) => setValues((v) => ({ ...v, subject: e.target.value }))}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Body</span>
              <textarea
                className="min-h-40 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                value={values.body}
                onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
              />
            </label>

            <p className="text-xs text-slate-400">{attachmentNote}</p>

            {confirmStep && (
              <div className="rounded-md border border-accent-200 bg-accent-50 p-3 text-xs text-slate-700">
                Send to <strong>{values.recipient}</strong> with subject <strong>{values.subject}</strong>? {attachmentNote}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={onClose}>
            Cancel
          </button>
          {!confirmStep ? (
            <button
              disabled={loading}
              className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              onClick={() => setConfirmStep(true)}
            >
              Review &amp; Send
            </button>
          ) : (
            <button
              disabled={sending}
              className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              onClick={handleSend}
            >
              {sending ? 'Sending…' : 'Confirm Send'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
