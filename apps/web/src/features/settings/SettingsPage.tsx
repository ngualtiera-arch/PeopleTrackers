import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CASE_TYPES } from '@peopletrackers/shared';
import { ActionBar } from '../../components/ActionBar';
import { useAuth } from '../../lib/auth';
import {
  useSettings,
  useUpdateSetting,
  useReferenceData,
  useSequences,
  useSetSequence,
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  type CompanySettings,
  type DefaultsSettings,
  type EmailSettingsValue,
  type AppUser,
} from './api';

const inputClass = 'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
      disabled={saving}
      onClick={onClick}
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
  );
}

function CompanySection({ initial }: { initial: CompanySettings }) {
  const [form, setForm] = useState(initial);
  const mutation = useUpdateSetting('company');
  useEffect(() => setForm(initial), [initial]);

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Company / Letterhead</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Legal Name"><input className={inputClass} value={form.legalName} onChange={(e) => set('legalName', e.target.value)} /></Field>
        <Field label="Trading As"><input className={inputClass} value={form.tradingAs} onChange={(e) => set('tradingAs', e.target.value)} /></Field>
        <Field label="ABN"><input className={inputClass} value={form.abn} onChange={(e) => set('abn', e.target.value)} /></Field>
        <Field label="Secondary ABN" hint="Not currently printed on reports — §21."><input className={inputClass} value={form.secondaryAbn} onChange={(e) => set('secondaryAbn', e.target.value)} /></Field>
        <Field label="ACN" hint="Not currently printed on reports — §21."><input className={inputClass} value={form.acn} onChange={(e) => set('acn', e.target.value)} /></Field>
        <Field label="Email"><input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Website"><input className={inputClass} value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
        <Field label="Additional Website"><input className={inputClass} value={form.additionalWebsite} onChange={(e) => set('additionalWebsite', e.target.value)} /></Field>
        <Field label="Postal Address"><input className={inputClass} value={form.postalAddress} onChange={(e) => set('postalAddress', e.target.value)} /></Field>
        <Field label="Contact Number"><input className={inputClass} value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} /></Field>
        <Field label="Confidentiality Line"><input className={inputClass} value={form.confidentialityLine} onChange={(e) => set('confidentialityLine', e.target.value)} /></Field>
        <Field label="Office By Appointment Line"><input className={inputClass} value={form.officeByAppointmentLine} onChange={(e) => set('officeByAppointmentLine', e.target.value)} /></Field>
      </div>
      <Field label="Logo" hint="No logo supplied yet (§22) — reports show a placeholder box until a URL is set here.">
        <input className={inputClass} placeholder="https://…" value={form.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value || null)} />
      </Field>
      <div className="flex justify-end">
        <SaveButton saving={mutation.isPending} onClick={() => mutation.mutate(form)} />
      </div>
    </section>
  );
}

function EmailSection({ initial }: { initial: EmailSettingsValue }) {
  const [form, setForm] = useState(initial);
  const mutation = useUpdateSetting('email');
  useEffect(() => setForm(initial), [initial]);

  function set<K extends keyof EmailSettingsValue>(key: K, value: EmailSettingsValue[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Email</h2>
      <p className="text-xs text-slate-400">
        Provider is a deployment configuration item (D6) — sending uses a capture/preview transport until one is
        configured here. Merge fields: {'{client_contact_name} {subject_full_name} {case_reference} {client_ref} {agent_first_name}'}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Provider" hint="Not yet configured."><input className={inputClass} value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value || null)} /></Field>
        <Field label="Sending Domain"><input className={inputClass} value={form.sendingDomain ?? ''} onChange={(e) => set('sendingDomain', e.target.value || null)} /></Field>
        <Field label="From Address"><input className={inputClass} value={form.fromAddress ?? ''} onChange={(e) => set('fromAddress', e.target.value || null)} /></Field>
        <Field label="Reply-To"><input className={inputClass} value={form.replyTo ?? ''} onChange={(e) => set('replyTo', e.target.value || null)} /></Field>
      </div>
      <Field label="Report Email Subject"><input className={inputClass} value={form.reportEmailSubject} onChange={(e) => set('reportEmailSubject', e.target.value)} /></Field>
      <Field label="Report Email Body"><textarea className={`${inputClass} min-h-32`} value={form.reportEmailBody} onChange={(e) => set('reportEmailBody', e.target.value)} /></Field>
      <Field label="Agent Instruction Subject"><input className={inputClass} value={form.agentInstructionSubject} onChange={(e) => set('agentInstructionSubject', e.target.value)} /></Field>
      <Field label="Agent Instruction Body"><textarea className={`${inputClass} min-h-24`} value={form.agentInstructionBody} onChange={(e) => set('agentInstructionBody', e.target.value)} /></Field>
      <div className="flex justify-end">
        <SaveButton saving={mutation.isPending} onClick={() => mutation.mutate(form)} />
      </div>
    </section>
  );
}

function DefaultsSection({ initial }: { initial: DefaultsSettings }) {
  const [form, setForm] = useState(initial);
  const mutation = useUpdateSetting('defaults');
  useEffect(() => setForm(initial), [initial]);

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Defaults</h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Default Case Type">
          <select className={inputClass} value={form.defaultCaseType} onChange={(e) => setForm((f) => ({ ...f, defaultCaseType: e.target.value }))}>
            {CASE_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Days Until Due">
          <input
            type="number"
            className={inputClass}
            value={form.daysUntilDue}
            onChange={(e) => setForm((f) => ({ ...f, daysUntilDue: Number(e.target.value) }))}
          />
        </Field>
      </div>
      <p className="text-xs text-slate-400">Default Agent is set from the Agents screen; Default Status is fixed to New Instruction (§6.1).</p>
      <div className="flex justify-end">
        <SaveButton saving={mutation.isPending} onClick={() => mutation.mutate(form)} />
      </div>
    </section>
  );
}

function SequenceField({ label, type, value }: { label: string; type: 'case' | 'client' | 'agent'; value: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const mutation = useSetSequence(type);

  useEffect(() => setDraft(String(value)), [value]);

  if (!editing) {
    return (
      <div>
        <span className="text-xs text-slate-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{value}</span>
          <button className="text-xs text-accent-600 hover:underline" onClick={() => setEditing(true)}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          className="rounded-md bg-accent-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          disabled={mutation.isPending}
          onClick={async () => {
            try {
              await mutation.mutateAsync(Number(draft));
              setEditing(false);
            } catch (err) {
              window.alert(err instanceof Error ? err.message : 'Could not update.');
            }
          }}
        >
          Save
        </button>
        <button className="rounded-md border border-slate-300 px-2 py-1 text-xs" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ReferenceDataSection() {
  const { data } = useReferenceData();
  const { data: sequences } = useSequences();

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-700">Reference Data</h2>
      <p className="text-xs text-slate-400">Packages/case types/statuses are read-only in V1 (§7) — same as the source. Reference sequences below are admin-editable, e.g. to continue exactly where the old system left off at go-live.</p>

      {sequences && (
        <div className="grid grid-cols-3 gap-4 border-b border-slate-100 pb-4 text-sm">
          <SequenceField label="Next Case Ref." type="case" value={sequences.caseReference} />
          <SequenceField label="Next Client Ref." type="client" value={sequences.clientReference} />
          <SequenceField label="Next Agent Ref." type="agent" value={sequences.agentReference} />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Packages</h3>
            {data.packages.map((p) => (
              <div key={p.id} className="flex justify-between border-b border-slate-50 py-1">
                <span>{p.name}</span>
                <span className="text-slate-500">Locate ${p.locateRate} / Non-Locate ${p.nonLocateRate}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Case Types</h3>
            {data.caseTypes.map((t) => (
              <div key={t.id} className="flex justify-between border-b border-slate-50 py-1">
                <span>{t.name}</span>
                <span className="text-slate-500">{t.usesPackage ? 'Uses package' : `Locate $${t.locateRate} / Non-Locate $${t.nonLocateRate}`}</span>
              </div>
            ))}
          </div>
          <div className="col-span-2">
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Statuses</h3>
            {data.caseStatuses.map((s) => (
              <div key={s.id} className="flex justify-between border-b border-slate-50 py-1">
                <span>{s.name}</span>
                <span className="text-slate-500">{s.feeRule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function UsersSection() {
  const { user: currentUser } = useAuth();
  const { data: users } = useUsers();
  const createMutation = useCreateUser();
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ email: '', name: '', role: 'staff', password: '' });
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPasswordValue] = useState('');
  const resetMutation = useResetPassword(resetTarget?.id ?? '');

  async function handleCreate() {
    await createMutation.mutateAsync(newForm);
    setShowNew(false);
    setNewForm({ email: '', name: '', role: 'staff', password: '' });
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Users</h2>
        <button className="text-sm text-accent-600 hover:underline" onClick={() => setShowNew((s) => !s)}>
          {showNew ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showNew && (
        <div className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 p-3">
          <Field label="Email"><input className={inputClass} value={newForm.email} onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Name"><input className={inputClass} value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Role">
            <select className={inputClass} value={newForm.role} onChange={(e) => setNewForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="Initial Password"><input type="password" className={inputClass} value={newForm.password} onChange={(e) => setNewForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          <div className="col-span-2 flex justify-end">
            <SaveButton saving={createMutation.isPending} onClick={handleCreate} />
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="py-1">Email</th>
            <th className="py-1">Name</th>
            <th className="py-1">Role</th>
            <th className="py-1">Status</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <UserRow key={u.id} u={u} isSelf={u.id === currentUser?.id} onResetPassword={() => setResetTarget(u)} />
          ))}
        </tbody>
      </table>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setResetTarget(null)}>
          <div className="w-80 rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Reset password — {resetTarget.email}</h3>
            <input
              type="password"
              className={inputClass}
              placeholder="New password"
              value={resetPassword}
              onChange={(e) => setResetPasswordValue(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={() => setResetTarget(null)}>
                Cancel
              </button>
              <button
                className="rounded-md bg-accent-600 px-3 py-1.5 text-sm text-white"
                disabled={resetMutation.isPending || resetPassword.length < 8}
                onClick={async () => {
                  await resetMutation.mutateAsync(resetPassword);
                  setResetTarget(null);
                  setResetPasswordValue('');
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function UserRow({ u, isSelf, onResetPassword }: { u: AppUser; isSelf: boolean; onResetPassword: () => void }) {
  const updateMutation = useUpdateUser(u.id);

  return (
    <tr className="border-b border-slate-50">
      <td className="py-1.5">{u.email}</td>
      <td className="py-1.5">{u.name}</td>
      <td className="py-1.5">
        <select
          className="rounded border border-slate-200 px-1.5 py-0.5 text-xs"
          value={u.role}
          disabled={isSelf}
          onChange={(e) => updateMutation.mutate({ role: e.target.value })}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      </td>
      <td className="py-1.5">
        <button
          disabled={isSelf}
          className={`rounded px-1.5 py-0.5 text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'} disabled:opacity-60`}
          onClick={() => updateMutation.mutate({ isActive: !u.isActive })}
        >
          {u.isActive ? 'Active' : 'Deactivated'}
        </button>
      </td>
      <td className="py-1.5 text-right">
        <button className="text-xs text-accent-600 hover:underline" onClick={onResetPassword}>
          Reset password
        </button>
      </td>
    </tr>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { data } = useSettings();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ActionBar />
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
          <button className="text-sm text-accent-600 hover:underline" onClick={() => navigate('/')}>
            ← Main Menu
          </button>
        </div>

        {data ? (
          <>
            <CompanySection initial={data.company} />
            <EmailSection initial={data.email} />
            <DefaultsSection initial={data.defaults} />
            <ReferenceDataSection />
            <UsersSection />
          </>
        ) : (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
      </div>
    </div>
  );
}
