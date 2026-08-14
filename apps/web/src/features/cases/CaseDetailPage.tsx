import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CASE_TYPES,
  CASE_STATUSES,
  PACKAGES,
  SUBJECT_TITLES,
  SUBJECT_GENDERS,
  AUSTRALIAN_STATES,
  DEFAULT_COUNTRY,
  REPORT_TEMPLATES,
  CASE_REPORT_OPTIONS,
  defaultReportChoice,
  type CaseStatusCode,
} from '@peopletrackers/shared';
import { ActionBar } from '../../components/ActionBar';
import { ReportChooserModal } from '../../components/ReportChooserModal';
import { EmailComposeModal, type EmailDefaults } from '../../components/EmailComposeModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { apiFetch, ApiError, API_BASE } from '../../lib/api-client';
import { TypeaheadPicker, type TypeaheadOption } from '../../components/TypeaheadPicker';
import { useAuth } from '../../lib/auth';
import { useCase, useCreateCase, useUpdateCase, useDeleteCase, useCopyTemplate, useCaseAttachments, useUploadAttachment, useDeleteAttachment } from './api';

// §13.4 chooser: from the case detail screen, scope is fixed to "Current Record" — switching
// to "Records Being Browsed" (the underlying list's filtered set) is better reached from the
// Files list itself, where that set is actually visible; only the single-record report types
// apply here.
const DETAIL_REPORT_OPTIONS = CASE_REPORT_OPTIONS.filter((o) => o.scope === 'single');

// Colour-coded status banner — reproduces the source's on-screen "NON LOCATE" red block
// (confirmed from a live recording of the FileMaker system). Only that one colour was directly
// observed; the rest of this map is a reasonable extension of the same red/amber/green logic
// (closed-without-result vs in-progress vs successful), not independently confirmed.
const STATUS_COLORS: Record<string, string> = {
  new_instruction: 'bg-slate-100 text-slate-700',
  leads_obtained: 'bg-amber-100 text-amber-800',
  non_locate: 'bg-red-100 text-red-700',
  located: 'bg-green-100 text-green-700',
  completed: 'bg-green-100 text-green-700',
  withdrawn: 'bg-slate-200 text-slate-600',
  credited_disputed: 'bg-red-100 text-red-700',
};
const REPORT_ENDPOINT: Record<string, string> = {
  case_report: '',
  update_report: 'update_report',
  agent_instruction: 'agent_instruction',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  'clientRef', 'dateDue', 'dateClosed',
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
  const { user } = useAuth();

  const { data: c, isLoading } = useCase(isNew ? undefined : id);
  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase(id ?? '');
  const deleteMutation = useDeleteCase();
  const copyTemplateMutation = useCopyTemplate(id ?? '');
  const { data: attachments } = useCaseAttachments(isNew ? undefined : id);
  const uploadAttachmentMutation = useUploadAttachment(id ?? '');
  const deleteAttachmentMutation = useDeleteAttachment(id ?? '');

  const [form, setForm] = useState<FormState>({});
  const [client, setClient] = useState<TypeaheadOption | null>(null);
  const [agent, setAgent] = useState<TypeaheadOption | null>(null);
  const [caseTypeCode, setCaseTypeCode] = useState<string>('skip_tracing');
  const [packageCode, setPackageCode] = useState<string>('');
  const [statusCode, setStatusCode] = useState<string>('new_instruction');
  const [reportSent, setReportSent] = useState(false);
  const [invoiced, setInvoiced] = useState(false);
  const [printChooserOpen, setPrintChooserOpen] = useState(false);
  const [emailReportOpen, setEmailReportOpen] = useState(false);
  const [emailInstructionOpen, setEmailInstructionOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors form/client/agent/etc for the autosave path, updated synchronously (a ref write, not
  // a state update) at the exact same point each setter fires. A debounced save reads this
  // instead of closing over the state variables directly: several `set()` calls can land in the
  // same React batch with no render committed in between (confirmed live — typing multiple
  // characters quickly saved a stale, pre-edit value), and only a ref mutation is guaranteed to
  // be current the instant the setTimeout callback actually runs, regardless of batching.
  const snapshotRef = useRef({
    form: {} as FormState,
    client: null as TypeaheadOption | null,
    agent: null as TypeaheadOption | null,
    caseTypeCode: 'skip_tracing',
    packageCode: '',
    statusCode: 'new_instruction',
    reportSent: false,
    invoiced: false,
  });

  useEffect(() => {
    if (c) {
      const next: FormState = {};
      for (const k of FIELD_KEYS) {
        const v = (c as unknown as Record<string, unknown>)[k];
        next[k] = v === null || v === undefined ? '' : String(v);
      }
      if (c.dateDue) next.dateDue = c.dateDue.slice(0, 10);
      if (c.subjectDob) next.subjectDob = c.subjectDob.slice(0, 10);
      if (c.dateClosed) next.dateClosed = c.dateClosed.slice(0, 10);
      setForm(next);
      setClient({ id: c.client.id, label: c.client.company ?? c.client.contactName ?? `#${c.client.reference}` });
      setAgent(c.agent ? { id: c.agent.id, label: c.agent.name ?? `#${c.agent.reference}` } : null);
      setCaseTypeCode(c.caseType.code);
      setPackageCode(c.package?.code ?? '');
      setStatusCode(c.status.code);
      setReportSent(c.reportSent);
      setInvoiced(c.invoiced);
      snapshotRef.current = {
        form: next,
        client: { id: c.client.id, label: c.client.company ?? c.client.contactName ?? `#${c.client.reference}` },
        agent: c.agent ? { id: c.agent.id, label: c.agent.name ?? `#${c.agent.reference}` } : null,
        caseTypeCode: c.caseType.code,
        packageCode: c.package?.code ?? '',
        statusCode: c.status.code,
        reportSent: c.reportSent,
        invoiced: c.invoiced,
      };
    } else if (isNew) {
      // Navigating here from an existing case's detail view reuses this same component — without
      // this, "New" would open showing the previous case's client/agent/form data still in state.
      setForm({});
      setClient(null);
      setAgent(null);
      setCaseTypeCode('skip_tracing');
      setPackageCode('');
      setStatusCode('new_instruction');
      setReportSent(false);
      setInvoiced(false);
      autoCreating.current = false;
    }
  }, [c, isNew]);

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/files') }]);

  function set(key: string, value: string) {
    const next = { ...snapshotRef.current.form, [key]: value };
    snapshotRef.current = { ...snapshotRef.current, form: next };
    setForm(next);
    markDirty();
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

  // Reproduces the source's actual behaviour: a FileMaker "New" record exists in the table the
  // instant it's created — there's no unsaved-draft state to guard against, which is why the
  // report-template buttons, Package, and email were never disabled there. A web form has no
  // equivalent moment, so the closest honest match is: create the real record as soon as the
  // one truly required field (Client) is picked, then quietly become the "editing an existing
  // case" screen — everything unlocks immediately, same as the source, without littering the
  // table with fully-blank rows for someone who picked New and then navigated away.
  //
  // Deliberately NOT a useEffect watching [isNew, client] — that was a real, confirmed bug.
  // Clicking New from an existing case's detail view leaves `client` holding that case's value
  // for one render (state doesn't clear synchronously just because the URL did); an effect
  // watching client would fire on that stale leftover value before the reset effect above ever
  // got a chance to clear it, auto-creating a new case FROM the old one's client. Tying this to
  // the picker's own onChange instead means it only ever runs from an actual user selection.
  const autoCreating = useRef(false);
  async function selectClient(opt: TypeaheadOption | null) {
    setClient(opt);
    snapshotRef.current = { ...snapshotRef.current, client: opt };
    markDirty();
    if (!isNew || !opt || autoCreating.current) return;
    autoCreating.current = true;
    try {
      const payload = buildPayload();
      payload.clientId = opt.id;
      const created = await createMutation.mutateAsync(payload);
      navigate(`/files/${created.id}`, { replace: true, state });
    } catch {
      autoCreating.current = false; // let them fix whatever failed and retry by re-picking the client
    }
  }

  // Builds the update payload from snapshotRef rather than the closure'd state variables — see
  // the comment on snapshotRef's declaration for why (debounced autosave needs the true latest
  // values at fire-time, not whatever render scheduled the timeout).
  function buildUpdatePayload(): Record<string, unknown> {
    const snap = snapshotRef.current;
    const payload: Record<string, unknown> = {};
    for (const k of FIELD_KEYS) {
      const v = snap.form[k];
      payload[k] = v === '' || v === undefined ? null : NUMERIC_KEYS.includes(k as (typeof NUMERIC_KEYS)[number]) ? Number(v) : v;
    }
    payload.caseTypeCode = snap.caseTypeCode;
    payload.statusCode = snap.statusCode;
    payload.reportSent = snap.reportSent;
    payload.invoiced = snap.invoiced;
    payload.agentId = snap.agent?.id ?? null;
    if (snap.client) payload.clientId = snap.client.id;
    // Update-only (§6.2) — manually picking a Package sticks until the next Client/Type
    // change recomputes and overwrites it, matching the source exactly.
    payload.packageCode = snap.packageCode || null;
    return payload;
  }

  async function saveExisting() {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaveStatus('saving');
    try {
      await updateMutation.mutateAsync(buildUpdatePayload());
      setAutosaveStatus('saved');
    } catch (err) {
      setAutosaveStatus('error');
      throw err;
    }
  }

  async function handleSave() {
    if (isNew) {
      if (!client) {
        window.alert('Select a client first.');
        return;
      }
      // Picking a client already triggers auto-create (above) — avoid a double-create race if
      // Save is clicked in the brief window before that finishes.
      if (autoCreating.current) return;
      autoCreating.current = true;
      const payload = buildPayload();
      payload.clientId = client.id;
      const created = await createMutation.mutateAsync(payload);
      navigate(`/files/${created.id}`, { replace: true });
    } else {
      try {
        await saveExisting();
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Save failed.');
      }
    }
  }

  // Debounced autosave — a safety net alongside the explicit Save button, not a replacement for
  // it (Save still commits immediately and takes priority). Deliberately triggered from each
  // field's own onChange (via markDirty, called from `set` and the other setters below) rather
  // than a useEffect watching all the form state: an effect fires on ANY state change including
  // the load effect's own repopulation, which needs a second render to fully settle — that gap
  // showed "Saving…" the instant a case opened with zero real edits (confirmed live). Nothing
  // here runs unless an actual onChange fires, which load never does.
  function markDirty() {
    if (isNew) return;
    setAutosaveStatus('pending');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveExisting().catch(() => {
        /* status already reflects the error; autosave retries on the next edit */
      });
    }, 2000);
  }
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  async function handleDelete() {
    if (!id || isNew) return;
    if (!window.confirm(`Delete case ${c?.reference}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      navigate('/files');
    } catch (err) {
      const isEmailHistoryConflict = err instanceof ApiError && err.status === 409;
      if (isEmailHistoryConflict && user?.role === 'admin') {
        const message = err instanceof Error ? err.message : 'This case has an emailed report on file.';
        if (window.confirm(`${message}\n\nAs an admin, you can delete it anyway — this also permanently removes the email record. Continue?`)) {
          try {
            await deleteMutation.mutateAsync({ id, force: true });
            navigate('/files');
          } catch (forceErr) {
            window.alert(forceErr instanceof Error ? forceErr.message : 'Delete failed.');
          }
        }
        return;
      }
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

  async function handleUploadAttachment(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      await uploadAttachmentMutation.mutateAsync(file);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  async function handleDeleteAttachment(attachmentId: string, filename: string) {
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    try {
      await deleteAttachmentMutation.mutateAsync(attachmentId);
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
  const statusMeta = CASE_STATUSES.find((s) => s.code === statusCode);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ActionBar
        onFind={() => navigate(`/files?reset=${Date.now()}`)}
        onNew={() => navigate('/files/new')}
        onDelete={isNew ? undefined : handleDelete}
        onPrint={isNew ? undefined : () => setPrintChooserOpen(true)}
        onPrev={prevId ? () => navigate(`/files/${prevId}`, { state }) : undefined}
        onNext={nextId ? () => navigate(`/files/${nextId}`, { state }) : undefined}
        prevNextLabel={currentIndex >= 0 ? `${currentIndex + 1} of ${orderedIds.length}` : undefined}
      />

      {printChooserOpen && (
        <ReportChooserModal
          title="Print"
          options={DETAIL_REPORT_OPTIONS}
          defaultCode={defaultReportChoice('detail', statusCode as CaseStatusCode)}
          onClose={() => setPrintChooserOpen(false)}
          onChoose={(code) => {
            const suffix = REPORT_ENDPOINT[code];
            window.open(`${API_BASE}/cases/${id}/report${suffix ? `?type=${suffix}` : ''}`, '_blank');
            setPrintChooserOpen(false);
          }}
        />
      )}

      {emailReportOpen && id && (
        <EmailComposeModal
          title="Email Report"
          attachmentNote="A PDF copy of the report will be attached."
          loadDefaults={() => {
            const chosen = defaultReportChoice('detail', statusCode as CaseStatusCode);
            const reportType = chosen === 'update_report' ? 'update_report' : 'case_report';
            return apiFetch<EmailDefaults>(`/cases/${id}/email/report-defaults?reportType=${reportType}`);
          }}
          onSend={async (values) => {
            const chosen = defaultReportChoice('detail', statusCode as CaseStatusCode);
            const reportType = chosen === 'update_report' ? 'update_report' : 'case_report';
            await apiFetch(`/cases/${id}/email/report`, { method: 'POST', body: JSON.stringify({ reportType, ...values }) });
          }}
          onClose={() => setEmailReportOpen(false)}
        />
      )}

      {emailInstructionOpen && id && (
        <EmailComposeModal
          title="Email Instruction"
          attachmentNote="No attachment is sent with this email (matches the existing system)."
          loadDefaults={() => apiFetch<EmailDefaults>(`/cases/${id}/email/agent-instruction-defaults`)}
          onSend={async (values) => {
            await apiFetch(`/cases/${id}/email/agent-instruction`, { method: 'POST', body: JSON.stringify(values) });
          }}
          onClose={() => setEmailInstructionOpen(false)}
        />
      )}

      <div className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{isNew ? 'New File' : `File ${c?.reference}`}</h1>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setEmailReportOpen(true)}
              >
                Email Report
              </button>
            )}
            {!isNew && (
              <span className="text-xs text-slate-400">
                {autosaveStatus === 'pending' && 'Unsaved changes'}
                {autosaveStatus === 'saving' && 'Saving…'}
                {autosaveStatus === 'saved' && 'Saved'}
                {autosaveStatus === 'error' && <span className="text-red-500">Autosave failed — click Save</span>}
              </span>
            )}
            <button className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => navigate('/files')}>
              Cancel
            </button>
            <button
              className="rounded-md bg-accent-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/*
          Landscape layout, matching the source's original single-screen spatial arrangement
          (confirmed from a recording of the live FileMaker system) rather than our previous
          stacked single-column screen: header + status share a row, then a two-column body —
          Subject/Address/Employer/Notes on the left, Confirmed Address + Report on the right —
          so the whole file fits with far less scrolling, styled with our own visual language.
        */}

        {/* Header + Status — §9.4 */}
        <section className="grid grid-cols-[1fr_auto] gap-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-4 gap-4">
            <Field label="Client">
              <TypeaheadPicker value={client} onChange={selectClient} search={searchClients} placeholder="Search clients…" />
              {client && !isNew && (
                <button type="button" className="mt-1 text-xs text-accent-600 hover:underline" onClick={() => navigate(`/clients/${client.id}`)}>
                  Open client →
                </button>
              )}
            </Field>
            <Field label="Client Ref."><input className={inputClass} value={form.clientRef ?? ''} onChange={(e) => set('clientRef', e.target.value)} /></Field>
            <Field label="Type">
              <select className={inputClass} value={caseTypeCode} onChange={(e) => { setCaseTypeCode(e.target.value); snapshotRef.current = { ...snapshotRef.current, caseTypeCode: e.target.value }; markDirty(); }}>
                {CASE_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Agent">
              <TypeaheadPicker value={agent} onChange={(opt) => { setAgent(opt); snapshotRef.current = { ...snapshotRef.current, agent: opt }; markDirty(); }} search={searchAgents} placeholder="Search agents…" />
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
            <Field label="Package" hint={isNew ? 'Computed once the case is saved.' : 'Auto-recomputed whenever Client or Type changes — a manual pick here is overwritten then.'}>
              <select
                className={`${inputClass} ${isNew ? 'bg-slate-50' : ''}`}
                value={packageCode}
                disabled={isNew}
                onChange={(e) => { setPackageCode(e.target.value); snapshotRef.current = { ...snapshotRef.current, packageCode: e.target.value }; markDirty(); }}
              >
                <option value="">—</option>
                {PACKAGES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Rate 1 (Locate)"><input type="number" step="0.01" className={inputClass} value={form.rateLocate ?? ''} onChange={(e) => set('rateLocate', e.target.value)} /></Field>
            <Field label="Rate 2 (Non Locate)"><input type="number" step="0.01" className={inputClass} value={form.rateNonLocate ?? ''} onChange={(e) => set('rateNonLocate', e.target.value)} /></Field>
            <Field label="Fee"><input type="number" step="0.01" className={inputClass} value={form.fee ?? ''} onChange={(e) => set('fee', e.target.value)} /></Field>
            <Field label="Units"><input type="number" step="0.01" className={inputClass} value={form.units ?? ''} onChange={(e) => set('units', e.target.value)} /></Field>
            <Field label="Inv. Amount"><input type="number" step="0.01" className={inputClass} value={form.amount ?? ''} onChange={(e) => set('amount', e.target.value)} /></Field>
          </div>

          <div className="w-64 border-l border-slate-100 pl-5">
            <div className="mb-2 text-xs font-medium text-slate-500">Status</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {CASE_STATUSES.map((s) => (
                <label key={s.code} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="radio" name="status" checked={statusCode === s.code} onChange={() => { setStatusCode(s.code); snapshotRef.current = { ...snapshotRef.current, statusCode: s.code }; markDirty(); }} />
                  {s.name}
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" checked={reportSent} onChange={(e) => { setReportSent(e.target.checked); snapshotRef.current = { ...snapshotRef.current, reportSent: e.target.checked }; markDirty(); }} /> Report Sent
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                <input type="checkbox" checked={invoiced} onChange={(e) => { setInvoiced(e.target.checked); snapshotRef.current = { ...snapshotRef.current, invoiced: e.target.checked }; markDirty(); }} /> Invoiced
              </label>
            </div>
            <div className={`mt-3 rounded-md px-3 py-2 text-center text-sm font-bold ${STATUS_COLORS[statusCode] ?? 'bg-accent-100 text-accent-700'}`}>
              {statusMeta?.name ?? statusCode}
            </div>
            {statusCode !== 'new_instruction' && (
              <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                Date Closed:
                <input
                  type="date"
                  className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                  value={form.dateClosed ?? ''}
                  onChange={(e) => set('dateClosed', e.target.value)}
                />
              </label>
            )}
          </div>
        </section>

        {/* Two-column body — §9.4 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            {/* Subject Details */}
            <section className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="col-span-3 text-sm font-semibold text-slate-700">Subject Details</h2>
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
              <Field label="Home Phone"><input className={inputClass} value={form.subjectPhHome ?? ''} onChange={(e) => set('subjectPhHome', e.target.value)} /></Field>
              <Field label="Mobile Phone"><input className={inputClass} value={form.subjectPhMobile ?? ''} onChange={(e) => set('subjectPhMobile', e.target.value)} /></Field>
              <Field label="Work Phone"><input className={inputClass} value={form.subjectPhWork ?? ''} onChange={(e) => set('subjectPhWork', e.target.value)} /></Field>
              <Field label="Other Phone"><input className={inputClass} value={form.subjectPhOther ?? ''} onChange={(e) => set('subjectPhOther', e.target.value)} /></Field>
              <div className="col-span-3">
                <Field label="Additional Info">
                  <textarea className={`${inputClass} min-h-16`} value={form.additionalInfo ?? ''} onChange={(e) => set('additionalInfo', e.target.value)} />
                </Field>
              </div>
            </section>

            {/* Last Known Address */}
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

            {/* Employer */}
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

            {/* Agent Notes */}
            <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">Agent Notes</h2>
                <button
                  type="button"
                  disabled={isNew || !agent}
                  title={!agent ? 'Assign an agent first' : undefined}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent"
                  onClick={() => setEmailInstructionOpen(true)}
                >
                  Email Instruction
                </button>
              </div>
              <textarea className={`${inputClass} min-h-24`} value={form.agentNotes ?? ''} onChange={(e) => set('agentNotes', e.target.value)} />
            </section>
          </div>

          {/* Confirmed Address + Report */}
          <section className="space-y-3 self-start rounded-lg border border-slate-200 bg-white p-4">
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
              <textarea className={`${inputClass} min-h-[28rem] font-mono`} value={form.report ?? ''} onChange={(e) => set('report', e.target.value)} />
            </Field>

            <div className="border-t border-slate-100 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Attachments</span>
                <label
                  className={`cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 ${isNew ? 'pointer-events-none opacity-40' : ''}`}
                  title={isNew ? 'Save the case first' : undefined}
                >
                  {uploadAttachmentMutation.isPending ? 'Uploading…' : 'Add file'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/heic,image/heif,application/pdf"
                    className="hidden"
                    disabled={isNew || uploadAttachmentMutation.isPending}
                    onChange={(e) => {
                      handleUploadAttachment(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {(!attachments || attachments.length === 0) && <p className="text-xs text-slate-400">No files attached yet. Screenshots and PDFs, up to 20MB each.</p>}
              {attachments && attachments.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                      <a
                        href={`${API_BASE}/cases/${id}/attachments/${a.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-accent-600 hover:underline"
                      >
                        {a.filename}
                      </a>
                      <span className="shrink-0 text-xs text-slate-400">{formatBytes(a.sizeBytes)}</span>
                      <button
                        type="button"
                        className="shrink-0 text-xs text-red-500 hover:underline"
                        onClick={() => handleDeleteAttachment(a.id, a.filename)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
