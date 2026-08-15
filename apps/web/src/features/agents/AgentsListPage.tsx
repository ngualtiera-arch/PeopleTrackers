import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar } from '../../components/ActionBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { API_BASE } from '../../lib/api-client';
import { useAgentsList } from './api';
import type { AgentWithSkills } from './types';

function addressLine(a: AgentWithSkills): string {
  return [a.addr1, a.city, a.state, a.postcode].filter(Boolean).join(', ');
}

export function AgentsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAgentsList({ search: search || undefined, needsReview: needsReview || undefined, page });

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/') }]);

  const items = data?.items ?? [];
  const orderedIds = items.map((a) => a.id);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function openAgent(id: string) {
    navigate(`/agents/${id}`, { state: { orderedIds, listLabel: 'Agents' } });
  }

  function printList() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (needsReview) params.set('needsReview', 'true');
    const qs = params.toString();
    window.open(`${API_BASE}/agents/report/list${qs ? `?${qs}` : ''}`, '_blank');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ActionBar
        onFind={() => document.getElementById('agent-search')?.focus()}
        onNew={() => navigate('/agents/new')}
        onPrint={printList}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search agents…"
      />

      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <input
          id="agent-search"
          type="text"
          placeholder="Search name, company, email, phone, city, state…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-96 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={needsReview}
            onChange={(e) => {
              setNeedsReview(e.target.checked);
              setPage(1);
            }}
          />
          Needs review
        </label>
        {data && (
          <span className="ml-auto text-xs text-slate-400">
            Showing {items.length} of {data.total}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Fax</th>
              <th className="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr
                key={a.id}
                onClick={() => openAgent(a.id)}
                className="cursor-pointer border-b border-slate-100 hover:bg-accent-50"
              >
                <td className="px-4 py-2 font-medium text-slate-800">
                  {a.name ?? <span className="text-slate-400">—</span>}
                  {a.needsReview && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">review</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">{a.company}</td>
                <td className="px-4 py-2 text-slate-600">{addressLine(a)}</td>
                <td className="px-4 py-2 text-slate-600">{a.phone}</td>
                <td className="px-4 py-2 text-slate-600">{a.fax}</td>
                <td className="px-4 py-2 text-slate-600">{a.email}</td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No agents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-2 text-sm">
          <button
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
