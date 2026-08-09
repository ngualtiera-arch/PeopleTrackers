import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CASE_TYPES,
  CASE_STATUSES,
  SUBJECT_TITLES,
  SUBJECT_GENDERS,
  AUSTRALIAN_STATES,
  DEFAULT_COUNTRY,
  REPORT_TEMPLATES,
} from '@peopletrackers/shared';
import { ActionBar } from '../../components/ActionBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { apiFetch } from '../../lib/api-client';
import { TypeaheadPicker, type TypeaheadOption } from '../../components/TypeaheadPicker';
import { useCase, useCreateCase, useUpdateCase, useDeleteCase, useCopyTemplate } from './api';

type FormState = Record<string, string>;

const SUBJECT_FIELD_KEYS = [
  'subjectTitle', 'subjectFirstname', 'subjectMiddlename', 'subjectLastname', 'subjectGender', 'subjectDob',
  'subjectLicence', 'subjectPhHome', 'subjectPhMobile', 'subjectPhWork', 'subjectPhOther',
] as const;

const LAST_KNOWN_KEYS = ['lastKnownAddr1', 'lastKnownAddr2', 'lastKnownCity', 'lastKnownState', 'lastKnownPostcode', 'lastKnownCountry'] as const;
const CONFIRMED_KEYS = ['confirmedAddr1', 'confirmedAddr2', 'confirmedCity', 'confirmedState', 'confirmedPostcode', 'confirmedCountry'] as const;
const EMPLOYER_KEYS = ['employer', 'employerAddr1', 'employerAddr2', 'employerCity', 'employerState', 'employerPostcode', 'employerCountry', 'employerPhone', 'employerFax'] as const;

const NUMERIC_KEYS = ['rateLocate', 'rateNonLocate', 'fee', 'units', 'amount'] as const;

const FIELD_KEYS = [
  'clientRef', 'dateDue',
  ...SUBJECT_FIELD_KEYS, ...CONFIRMED_KEYS, ...LAST_KNOWN_KEYS, ...EMPLOYER_KEYS,
  'additionalInfo', 'agentNotes', 'report',
  ...NUMERIC_KEYS,
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

const inputClass = 'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

async function searchClients(query: string): Promise<TypeaheadOption[]> {
  const res = await apiFetch<{ items: { id: string; company: string | null; contactName: string | null; reference: number }[] }>(
    `/clients?search=${encodeURIComponent(query)}&pageSize=10`,
  );
  return res.items.map((c) => ({ id: c.id, label: c.company ?? c.contactName ?? `Client ${c.reference}`, sublabel: `#${c.reference}` }));
}

async function searchAgents(query: string): Promise<TypeaheadOption[]> {
  const res = await apiFetch<{ items: { id: string; name: string | null; reference: number }[] }>(
    `/agents?search=${encodeURIComponent(query)}&pageSize=10`,
  );
  return res.items.map((a) => ({ id: a.id, label: a.name ?? `Agent ${a.reference}`, sublabel: `#${a.reference}` }));
}

export function CaseDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new' || id === undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { orderedIds?: string[] } | null;

  const { data: c, isLoading } = useCase(isNew ? undefined : id);
  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase(id ?? '');
  const deleteMutation = useDeleteCase();
  const copyTemplateMutation = useCopyTemplate(id ?? '');

  const [form, setForm] = useState<FormState>({});
  const [client, setClient] = useState<TypeaheadOption | null>(null);
  const [agent, setAgent] = useState<TypeaheadOption | null>(null);
  const [caseTypeCode, setCaseTypeCode] = useState<string>('skip_tracing');
  const [statusCode, setStatusCode] = useState<string>('new_instruction');
  const [reportSent, setReportSent] = useState(false);
  const [invoiced, setInvoiced] = useState(false);

  useEffect(() => {
    if (c) {
      const next: FormState = {};
      for (const k of FIELD_KEYS) {
        const v = (c as unknown as Record<string, unknown>)[k];
        next[k] = v === null || v === undefined ? '' : String(v);
      }
      if (c.dateDue) next.dateDue = c.dateDue.slice(0, 10);
      if (c.subjectDob) next.subjectDob = c.subjectDob.slice(0, 10);
      setForm(next);
      setClient({ id: c.client.id, label: c.client.company ?? c.client.contactName ?? `#${c.client.reference}` });
      setAgent(c.agent ? { id: c.agent.id, label: c.agent.name ?? `#${c.agent.reference}` } : null);
      setCaseTypeCode(c.caseType.code);
      setStatusCode(c.status.code);
      setReportSent(c.reportSent);
      setInvoiced(c.invoiced);
    }
  }, [c]);

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/files') }]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const k of FIELD_KEYS) {
      const v = form[k];
      payload[k] = v === '' ? null : NUMERIC_KEYS.includes(k as (typeof NUMERIC_KEYS)[number]) ? Number(v) : v;
    }
    payload.caseTypeCode = caseTypeCode;
    payload.statusCode = statusCode;
    payload.reportSent = reportSent;
    payload.invoiced = invoiced;
    payload.agentId = agent?.id ?? null;
    return payload;
  }

  async function handleSave() {
    if (isNew) {
      if (!client) {
        window.alert('Select a client first.');
        return;
      }
      const payload = buildPayload();
      payload.clientId = client.id;
      const created = await createMutation.mutateAsync(payload);
      navigate(`/files/${created.id}`, { replace: true });
    } else {
      const payload = buildPayload();
      if (client) payload.clientId = client.id;
      await updateMutation.mutateAsync(payload);
    }
  }

  async function handleDelete() {
    if (!id || isNew) return;
    if (!window.confirm(`Delete case ${c?.reference}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/files');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleCopyTemplate(templateCode: string) {
    const hasContent = (form.report ?? '').trim() !== '';
    if (hasContent && !window.confirm('Replace existing report contents?')) return;
    try {
      const updated = await copyTemplateMutation.mutateAsync({ templateCode, confirmReplace: hasContent });
      set('report', updated.report ?? '');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not copy template.');
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
  const statusMeta = CASE_STATUSES.find((s) => s.code === statusCode);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ActionBar
        onDelete={isNew ? undefined : handleDelete}
        onPrev={prevId ? () => navigate(`/files/${prevId}`, { state }) : undefined}
        onNext={nextId ? () => navigate(`/files/${nextId}`, { state }) : undefined}
        prevNextLabel={currentIndex >= 0 ? `${currentIndex + 1} of ${orderedIds.length}` : undefined}
      />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{isNew ? 'New File' : `File ${c?.reference}`}</h1>
        </div>

        {/* Header block — §9.4 */}
        <section className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Client">
            <TypeaheadPicker value={client} onChange={setClient} search={searchClients} placeholder="Search clients…" />
            {client && !isNew && (
              <button type="button" className="mt-1 text-xs text-accent-600 hover:underline" onClick={() => navigate(`/clients/${client.id}`)}>
                Open client →
              </button>
            )}
          </Field>
          <Field label="Client Ref."><input className={inputClass} value={form.clientRef ?? ''} onChange={(e) => set('clientRef', e.target.value)} /></Field>
          <Field label="Type">
            <select className={inputClass} value={caseTypeCode} onChange={(e) => setCaseTypeCode(e.target.value)}>
              {CASE_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Agent">
            <TypeaheadPicker value={agent} onChange={setAgent} search={searchAgents} placeholder="Search agents…" />
            {agent && !isNew && (
              <button type="button" className="mt-1 text-xs text-accent-600 hover:underline" onClick={() => navigate(`/agents/${agent.id}`)}>
                Open agent →
              </button>
            )}
          </Field>
          <Field label="Date Entered">
            <input className={`${inputClass} bg-slate-50`} value={c?.dateEntered ? new Date(c.dateEntered).toLocaleDateString('en-AU') : '—'} disabled />
          </Field>
          <Field label="Date Due"><input type="date" className={inputClass} value={form.dateDue ?? ''} onChange={(e) => set('dateDue', e.target.value)} /></Field>
          <Field label="Package" hint="Computed from client + type — not directly editable.">
            <input className={`${inputClass} bg-slate-50`} value={c?.package?.name ?? '—'} disabled />
          </Field>
          <Field label="Rate 1 (Locate)"><input type="number" step="0.01" className={inputClass} value={form.rateLocate ?? ''} onChange={(e) => set('rateLocate', e.target.value)} /></Field>
          <Field label="Rate 2 (Non Locate)"><input type="number" step="0.01" className={inputClass} value={form.rateNonLocate ?? ''} onChange={(e) => set('rateNonLocate', e.target.value)} /></Field>
          <Field label="Fee"><input type="number" step="0.01" className={inputClass} value={form.fee ?? ''} onChange={(e) => set('fee', e.target.value)} /></Field>
          <Field label="Units"><input type="number" step="0.01" className={inputClass} value={form.units ?? ''} onChange={(e) => set('units', e.target.value)} /></Field>
          <Field label="Inv. Amount"><input type="number" step="0.01" className={inputClass} value={form.amount ?? ''} onChange={(e) => set('amount', e.target.value)} /></Field>
        </section>

        {/* Status panel — §9.4 */}
        <section className="flex items-center gap-6 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Status">
            <select className={inputClass} value={statusCode} onChange={(e) => setStatusCode(e.target.value)}>
              {CASE_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={reportSent} onChange={(e) => setReportSent(e.target.checked)} /> Report Sent
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={invoiced} onChange={(e) => setInvoiced(e.target.checked)} /> Invoiced
          </label>
          <div className="text-sm text-slate-500">
            Date Closed: {c?.dateClosed ? new Date(c.dateClosed).toLocaleDateString('en-AU') : '—'}
          </div>
          <span className="ml-auto rounded-full bg-accent-100 px-4 py-1.5 text-sm font-semibold text-accent-700">
            {statusMeta?.name ?? statusCode}
          </span>
        </section>

        {/* Subject Details — §9.4 */}
        <section className="grid grid-cols-4 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="col-span-4 text-sm font-semibold text-slate-700">Subject Details</h2>
          <Field label="Title">
            <select className={inputClass} value={form.subjectTitle ?? ''} onChange={(e) => set('subjectTitle', e.target.value)}>
              <option value="">—</option>
              {SUBJECT_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="First Name"><input className={inputClass} value={form.subjectFirstname ?? ''} onChange={(e) => set('subjectFirstname', e.target.value)} /></Field>
          <Field label="Middle"><input className={inputClass} value={form.subjectMiddlename ?? ''} onChange={(e) => set('subjectMiddlename', e.target.value)} /></Field>
          <Field label="Last Name"><input className={inputClass} value={form.subjectLastname ?? ''} onChange={(e) => set('subjectLastname', e.target.value)} /></Field>
          <Field label="DOB"><input type="date" className={inputClass} value={form.subjectDob ?? ''} onChange={(e) => set('subjectDob', e.target.value)} /></Field>
          <Field label="Gender">
            <select className={inputClass} value={form.subjectGender ?? ''} onChange={(e) => set('subjectGender', e.target.value)}>
              <option value="">—</option>
              {SUBJECT_GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Drivers License"><input className={inputClass} value={form.subjectLicence ?? ''} onChange={(e) => set('subjectLicence', e.target.value)} /></Field>
          <div />
          <Field label="Home Phone"><input className={inputClass} value={form.subjectPhHome ?? ''} onChange={(e) => set('subjectPhHome', e.target.value)} /></Field>
          <Field label="Mobile Phone"><input className={inputClass} value={form.subjectPhMobile ?? ''} onChange={(e) => set('subjectPhMobile', e.target.value)} /></Field>
          <Field label="Work Phone"><input className={inputClass} value={form.subjectPhWork ?? ''} onChange={(e) => set('subjectPhWork', e.target.value)} /></Field>
          <Field label="Other Phone"><input className={inputClass} value={form.subjectPhOther ?? ''} onChange={(e) => set('subjectPhOther', e.target.value)} /></Field>
          <div className="col-span-4">
            <Field label="Additional Info">
              <textarea className={`${inputClass} min-h-20`} value={form.additionalInfo ?? ''} onChange={(e) => set('additionalInfo', e.target.value)} />
            </Field>
          </div>
        </section>

        {/* Last Known Address — §9.4 */}
        <section className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="col-span-3 text-sm font-semibold text-slate-700">Last Known Address</h2>
          <Field label="Address 1"><input className={inputClass} value={form.lastKnownAddr1 ?? ''} onChange={(e) => set('lastKnownAddr1', e.target.value)} /></Field>
          <Field label="Address 2"><input className={inputClass} value={form.lastKnownAddr2 ?? ''} onChange={(e) => set('lastKnownAddr2', e.target.value)} /></Field>
          <Field label="City"><input className={inputClass} value={form.lastKnownCity ?? ''} onChange={(e) => set('lastKnownCity', e.target.value)} /></Field>
          <Field label="State">
            {(form.lastKnownCountry || DEFAULT_COUNTRY) === DEFAULT_COUNTRY ? (
              <select className={inputClass} value={form.lastKnownState ?? ''} onChange={(e) => set('lastKnownState', e.target.value)}>
                <option value="">—</option>
                {AUSTRALIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input className={inputClass} value={form.lastKnownState ?? ''} onChange={(e) => set('lastKnownState', e.target.value)} />
            )}
          </Field>
          <Field label="Postcode"><input className={inputClass} value={form.lastKnownPostcode ?? ''} onChange={(e) => set('lastKnownPostcode', e.target.value)} /></Field>
          <Field label="Country"><input className={inputClass} value={form.lastKnownCountry ?? ''} onChange={(e) => set('lastKnownCountry', e.target.value)} /></Field>
        </section>

        {/* Employer — §9.4 */}
        <section className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="col-span-3 text-sm font-semibold text-slate-700">Employer</h2>
          <Field label="Company"><input className={inputClass} value={form.employer ?? ''} onChange={(e) => set('employer', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputClass} value={form.employerPhone ?? ''} onChange={(e) => set('employerPhone', e.target.value)} /></Field>
          <Field label="Fax"><input className={inputClass} value={form.employerFax ?? ''} onChange={(e) => set('employerFax', e.target.value)} /></Field>
          <Field label="Address 1"><input className={inputClass} value={form.employerAddr1 ?? ''} onChange={(e) => set('employerAddr1', e.target.value)} /></Field>
          <Field label="Address 2"><input className={inputClass} value={form.employerAddr2 ?? ''} onChange={(e) => set('employerAddr2', e.target.value)} /></Field>
          <Field label="City"><input className={inputClass} value={form.employerCity ?? ''} onChange={(e) => set('employerCity', e.target.value)} /></Field>
          <Field label="State"><input className={inputClass} value={form.employerState ?? ''} onChange={(e) => set('employerState', e.target.value)} /></Field>
          <Field label="Postcode"><input className={inputClass} value={form.employerPostcode ?? ''} onChange={(e) => set('employerPostcode', e.target.value)} /></Field>
          <Field label="Country"><input className={inputClass} value={form.employerCountry ?? ''} onChange={(e) => set('employerCountry', e.target.value)} /></Field>
        </section>

        {/* Agent Notes — §9.4 */}
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Agent Notes</h2>
            <button
              type="button"
              disabled
              title="Email available in Phase 5"
              className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-400"
            >
              Email Instruction
            </button>
          </div>
          <textarea className={`${inputClass} min-h-24`} value={form.agentNotes ?? ''} onChange={(e) => set('agentNotes', e.target.value)} />
        </section>

        {/* Report panel — §9.4 */}
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Confirmed Address</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Address 1"><input className={inputClass} value={form.confirmedAddr1 ?? ''} onChange={(e) => set('confirmedAddr1', e.target.value)} /></Field>
            <Field label="Address 2"><input className={inputClass} value={form.confirmedAddr2 ?? ''} onChange={(e) => set('confirmedAddr2', e.target.value)} /></Field>
            <Field label="City"><input className={inputClass} value={form.confirmedCity ?? ''} onChange={(e) => set('confirmedCity', e.target.value)} /></Field>
            <Field label="State"><input className={inputClass} value={form.confirmedState ?? ''} onChange={(e) => set('confirmedState', e.target.value)} /></Field>
            <Field label="Postcode"><input className={inputClass} value={form.confirmedPostcode ?? ''} onChange={(e) => set('confirmedPostcode', e.target.value)} /></Field>
            <Field label="Country"><input className={inputClass} value={form.confirmedCountry ?? ''} onChange={(e) => set('confirmedCountry', e.target.value)} /></Field>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {REPORT_TEMPLATES.map((t) => (
              <button
                key={t.code}
                type="button"
                disabled={isNew}
                title={isNew ? 'Save the case first' : undefined}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                onClick={() => handleCopyTemplate(t.code)}
              >
                {t.buttonLabel}
              </button>
            ))}
            <button type="button" className="ml-auto text-xs text-accent-600 hover:underline" onClick={() => navigate('/templates')}>
              Edit Templates
            </button>
          </div>

          <Field label="Report">
            <textarea className={`${inputClass} min-h-48 font-mono`} value={form.report ?? ''} onChange={(e) => set('report', e.target.value)} />
          </Field>
        </section>

        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={() => navigate('/files')}>
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
