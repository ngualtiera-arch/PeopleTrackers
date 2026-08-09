import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AUSTRALIAN_STATES, AGENT_SKILLS, DEFAULT_COUNTRY, type AgentSkillCode } from '@peopletrackers/shared';
import { ActionBar } from '../../components/ActionBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { API_BASE } from '../../lib/api-client';
import { useAgent, useCreateAgent, useUpdateAgent, useDeleteAgent } from './api';

type FormState = Record<string, string>;

// Mobile and Rate are stored but NOT shown here — reproduces the existing layout, which omits
// both (D13). They're simply never part of this form's payload, so saving never touches them.
const FIELD_KEYS = ['name', 'company', 'email', 'addr1', 'addr2', 'city', 'state', 'postcode', 'country', 'phone', 'fax', 'notes'] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

export function AgentDetailPage() {
  const { id } = useParams();
  const isNew = id === 'new' || id === undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { orderedIds?: string[] } | null;

  const { data: agent, isLoading } = useAgent(isNew ? undefined : id);
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent(id ?? '');
  const deleteMutation = useDeleteAgent();

  const [form, setForm] = useState<FormState>({});
  const [skills, setSkills] = useState<Set<AgentSkillCode>>(new Set());

  useEffect(() => {
    if (agent) {
      const next: FormState = {};
      for (const k of FIELD_KEYS) {
        const v = (agent as unknown as Record<string, unknown>)[k];
        next[k] = v === null || v === undefined ? '' : String(v);
      }
      setForm(next);
      setSkills(new Set(agent.skills.map((s) => s.skill)));
    }
  }, [agent]);

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/agents') }]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleSkill(code: AgentSkillCode) {
    setSkills((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSave() {
    const payload: Record<string, unknown> = {};
    for (const k of FIELD_KEYS) {
      payload[k] = form[k] === '' ? null : form[k];
    }
    payload.skills = Array.from(skills);

    if (isNew) {
      const created = await createMutation.mutateAsync(payload);
      navigate(`/agents/${created.id}`, { replace: true });
    } else {
      await updateMutation.mutateAsync(payload);
    }
  }

  async function handleDelete() {
    if (!id || isNew) return;
    if (!window.confirm(`Delete agent "${agent?.name ?? id}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      navigate('/agents');
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
        onDelete={isNew ? undefined : handleDelete}
        onPrint={isNew ? undefined : () => window.open(`${API_BASE}/agents/${id}/report`, '_blank')}
        onPrev={prevId ? () => navigate(`/agents/${prevId}`, { state }) : undefined}
        onNext={nextId ? () => navigate(`/agents/${nextId}`, { state }) : undefined}
        prevNextLabel={currentIndex >= 0 ? `${currentIndex + 1} of ${orderedIds.length}` : undefined}
      />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{isNew ? 'New Agent' : agent?.name || 'Agent'}</h1>
          <div className="flex items-center gap-3">
            {!isNew && (
              <button
                className="text-sm text-accent-600 hover:underline"
                onClick={() => window.open(`${API_BASE}/agents/${id}/report?type=envelope`, '_blank')}
              >
                Print Envelope
              </button>
            )}
            {!isNew && <span className="text-sm text-slate-400">ID Agent: {agent?.reference}</span>}
          </div>
        </div>

        <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Name"><input className={inputClass} value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Company"><input className={inputClass} value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} /></Field>
          <Field label="Email"><input className={inputClass} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        </section>

        <section className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4">
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
          <Field label="Phone"><input className={inputClass} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Fax"><input className={inputClass} value={form.fax ?? ''} onChange={(e) => set('fax', e.target.value)} /></Field>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <span className="mb-2 block text-xs font-medium text-slate-500">Skills</span>
          <div className="flex gap-4">
            {AGENT_SKILLS.map((s) => (
              <label key={s.code} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input type="checkbox" checked={skills.has(s.code)} onChange={() => toggleSkill(s.code)} />
                {s.name}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <Field label="Notes">
            <textarea className={`${inputClass} min-h-24`} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </section>

        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-sm" onClick={() => navigate('/agents')}>
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
