import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CLIENT_KINDS, AUSTRALIAN_STATES, PACKAGES, DEFAULT_COUNTRY } from '@peopletrackers/shared';
import { ActionBar } from '../../components/ActionBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { API_BASE } from '../../lib/api-client';
import { useClient, useCreateClient, useUpdateClient, useDeleteClient } from './api';

type FormState = Record<string, string>;

const FIELD_KEYS = [
  'company', 'kind', 'contactName', 'email',
  'addr1', 'addr2', 'city', 'state', 'postcode', 'country',
  'postalAddr1', 'postalAddr2', 'postalCity', 'postalState', 'postalPostcode', 'postalCountry',
  'phone', 'fax', 'notes', 'attention', 'emailInvoice', 'emailReports', 'terms', 'abn',
  'fileFee', 'locateFee', 'nonLocateFee', 'hourlyFee',
] as const;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

export function ClientDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new' || id === undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { orderedIds?: string[] } | null;

  const { data: client, isLoading } = useClient(isNew ? undefined : id);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient(id ?? '');
  const deleteMutation = useDeleteClient();

  const [form, setForm] = useState<FormState>({});
  const [packageCode, setPackageCode] = useState('');

  useEffect(() => {
    if (client) {
      const next: FormState = {};
      for (const k of FIELD_KEYS) {
        const v = (client as unknown as Record<string, unknown>)[k];
        next[k] = v === null || v === undefined ? '' : String(v);
      }
      setForm(next);
      setPackageCode(client.package?.code ?? '');
    }
  }, [client]);

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/clients') }]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {};
    for (const k of FIELD_KEYS) {
      const v = form[k];
      if (['fileFee', 'locateFee', 'nonLocateFee', 'hourlyFee'].includes(k)) {
        payload[k] = v === '' ? null : Number(v);
      } else {
        payload[k] = v === '' ? null : v;
      }
    }
    payload.kind = form.kind || null;
    payload.packageCode = packageCode || null;

    if (isNew) {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/clients/${created.id}`, { replace: true });
    } else {
      await updateMutation.mutateAsync(payload);
    }
  }

  async function handleDelete() {
    if (!id || isNew) return;
    if (!window.confirm(`Delete client "${client?.company ?? client?.contactName ?? id}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/clients');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  const orderedIds = state?.orderedIds ?? [];
  const currentIndex = id ? orderedIds.indexOf(id) : -1;
  const prevId = currentIndex > 0 ? orderedIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < orderedIds.length - 1 ? orderedIds[currentIndex + 1] : null;

  if (!isNew && isLoading) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ActionBar
        onFind={() => navigate(`/files?reset=${Date.now()}`)}
        onDelete={isNew ? undefined : handleDelete}
        onPrint={isNew ? undefined : () => window.open(`${API_BASE}/clients/${id}/report`, '_blank')}
        onPrev={prevId ? () => navigate(`/clients/${prevId}`, { state }) : undefined}
        onNext={nextId ? () => navigate(`/clients/${nextId}`, { state }) : undefined}
        prevNextLabel={currentIndex >= 0 ? `${currentIndex + 1} of ${orderedIds.length}` : undefined}
      />

      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">
            {isNew ? 'New Client' : client?.company || client?.contactName || 'Client'}
          </h1>
          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                className="text-sm text-accent-600 hover:underline"
                onClick={() => window.open(`${API_BASE}/clients/${id}/report?type=envelope`, '_blank')}
              >
                Print Envelope
              </button>
            )}
            {!isNew && <span className="text-sm text-slate-400">ID Client: {client?.reference}</span>}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Company"><input className={inputClass} value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} /></Field>
          <Field label="Kind">
            <select className={inputClass} value={form.kind ?? ''} onChange={(e) => set('kind', e.target.value)}>
              <option value="">—</option>
              {CLIENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Name"><input className={inputClass} value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700">Physical address</h2>
            <Field label="Address 1"><input className={inputClass} value={form.addr1 ?? ''} onChange={(e) => set('addr1', e.target.value)} /></Field>
            <Field label="Address 2"><input className={inputClass} value={form.addr2 ?? ''} onChange={(e) => set('addr2', e.target.value)} /></Field>
            <Field label="City"><input className={inputClass} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="State">
              {(form.country ?? DEFAULT_COUNTRY) === DEFAULT_COUNTRY ? (
                <select className={inputClass} value={form.state ?? ''} onChange={(e) => set('state', e.target.value)}>
                  <option value="">—</option>
                  {AUSTRALIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input className={inputClass} value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} />
              )}
            </Field>
            <Field label="Postcode"><input className={inputClass} value={form.postcode ?? ''} onChange={(e) => set('postcode', e.target.value)} /></Field>
            <Field label="Country"><input className={inputClass} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} /></Field>
          </div>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700">Postal address</h2>
            <Field label="Address 1"><input className={inputClass} value={form.postalAddr1 ?? ''} onChange={(e) => set('postalAddr1', e.target.value)} /></Field>
            <Field label="Address 2"><input className={inputClass} value={form.postalAddr2 ?? ''} onChange={(e) => set('postalAddr2', e.target.value)} /></Field>
            <Field label="City"><input className={inputClass} value={form.postalCity ?? ''} onChange={(e) => set('postalCity', e.target.value)} /></Field>
            <Field label="State"><input className={inputClass} value={form.postalState ?? ''} onChange={(e) => set('postalState', e.target.value)} /></Field>
            <Field label="Postcode"><input className={inputClass} value={form.postalPostcode ?? ''} onChange={(e) => set('postalPostcode', e.target.value)} /></Field>
            <Field label="Country"><input className={inputClass} value={form.postalCountry ?? ''} onChange={(e) => set('postalCountry', e.target.value)} /></Field>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Phone"><input className={inputClass} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Fax"><input className={inputClass} value={form.fax ?? ''} onChange={(e) => set('fax', e.target.value)} /></Field>
          <Field label="Attention"><input className={inputClass} value={form.attention ?? ''} onChange={(e) => set('attention', e.target.value)} /></Field>
          <Field label="Terms"><input className={inputClass} value={form.terms ?? ''} onChange={(e) => set('terms', e.target.value)} /></Field>
          <Field label="Email Invoice"><input className={inputClass} value={form.emailInvoice ?? ''} onChange={(e) => set('emailInvoice', e.target.value)} /></Field>
          <Field label="Email Reports" hint="Default recipient when a report is emailed from a case.">
            <input className={inputClass} value={form.emailReports ?? ''} onChange={(e) => set('emailReports', e.target.value)} />
          </Field>
          <Field label="ABN"><input className={inputClass} value={form.abn ?? ''} onChange={(e) => set('abn', e.target.value)} /></Field>
          <div />
          <div className="col-span-2">
            <Field label="Notes">
              <textarea className={`${inputClass} min-h-24`} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Package">
            <select className={inputClass} value={packageCode} onChange={(e) => setPackageCode(e.target.value)}>
              <option value="">—</option>
              {PACKAGES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Hourly Fee" hint="Captured for reference only — does not drive pricing.">
            <input className={inputClass} type="number" step="0.01" value={form.hourlyFee ?? ''} onChange={(e) => set('hourlyFee', e.target.value)} />
          </Field>
          <Field label="File Fee" hint="Captured for reference only — does not drive pricing.">
            <input className={inputClass} type="number" step="0.01" value={form.fileFee ?? ''} onChange={(e) => set('fileFee', e.target.value)} />
          </Field>
          <Field label="Locate Fee" hint="Captured for reference only — does not drive pricing.">
            <input className={inputClass} type="number" step="0.01" value={form.locateFee ?? ''} onChange={(e) => set('locateFee', e.target.value)} />
          </Field>
          <Field label="Non Locate Fee" hint="Captured for reference only — does not drive pricing.">
            <input className={inputClass} type="number" step="0.01" value={form.nonLocateFee ?? ''} onChange={(e) => set('nonLocateFee', e.target.value)} />
          </Field>
        </section>

        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={() => navigate('/clients')}>
            Cancel
          </button>
          <button
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
