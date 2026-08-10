import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CASE_SAVED_FILTERS, CASE_REPORT_OPTIONS, defaultReportChoice } from '@peopletrackers/shared';
import { ActionBar } from '../../components/ActionBar';
import { ReportChooserModal } from '../../components/ReportChooserModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { API_BASE } from '../../lib/api-client';
import { useCasesList, type CaseListParams } from './api';

function fmtDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-AU');
}

// §13.4 chooser: from the list screen, only the result-set report types apply — Batch PDF
// (a separate action-bar button, §13.6) already covers "print the File Report for every
// record being browsed".
const LIST_REPORT_OPTIONS = CASE_REPORT_OPTIONS.filter((o) => o.scope === 'result_set');
const REPORT_ENDPOINT: Record<string, string> = {
  client_status_report: 'client-status',
  file_list_by_agent: 'file-list-by-agent',
};

export function FilesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  // §12.2: the list opens on New Instruction — reproduced here as the screen's own initial
  // state so it holds regardless of how the screen was reached, matching the source's startup
  // script intent without hard-coding it only into the post-login redirect.
  const [filter, setFilter] = useState<CaseListParams['filter']>('new_instruction');
  const [sort, setSort] = useState<CaseListParams['sort']>();
  const [page, setPage] = useState(1);
  const [printChooserOpen, setPrintChooserOpen] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);

  const { data, isLoading } = useCasesList({ search: search || undefined, filter, sort, page });

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/') }]);

  // Cmd+F landing here (see ActionBar) — clear back to a blank find, same as the source.
  useEffect(() => {
    if (!searchParams.has('reset')) return;
    setSearch('');
    setFilter('all');
    setSort(undefined);
    setPage(1);
    setSearchParams({}, { replace: true });
    document.getElementById('case-search')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const items = data?.items ?? [];
  const orderedIds = items.map((c) => c.id);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function openCase(id: string) {
    navigate(`/files/${id}`, { state: { orderedIds, listLabel: 'Files' } });
  }

  function toggleSort(key: NonNullable<CaseListParams['sort']>) {
    setSort((s) => (s === key ? (`-${key}` as CaseListParams['sort']) : key));
  }

  function printResultSetReport(code: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter && filter !== 'all') params.set('filter', filter);
    const qs = params.toString();
    window.open(`${API_BASE}/cases/report/${REPORT_ENDPOINT[code]}${qs ? `?${qs}` : ''}`, '_blank');
    setPrintChooserOpen(false);
  }

  async function runBatchPdf() {
    if (!data || data.total === 0) return;
    if (!window.confirm(`Generate a batch PDF for ${data.total} case${data.total === 1 ? '' : 's'} and mark them all Report Sent?`)) {
      return;
    }
    setBatchRunning(true);
    try {
      const res = await fetch(`${API_BASE}/cases/report/batch`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter, search: search || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(body.message ?? 'Batch PDF failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Batch PDF failed.');
    } finally {
      setBatchRunning(false);
    }
  }

  function sortIndicator(key: string) {
    if (sort === key) return '▲';
    if (sort === `-${key}`) return '▼';
    return '';
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ActionBar
        onFind={() => document.getElementById('case-search')?.focus()}
        onNew={() => navigate('/files/new')}
        onPrint={() => setPrintChooserOpen(true)}
        onBatchPdf={batchRunning ? undefined : runBatchPdf}
      />

      {printChooserOpen && (
        <ReportChooserModal
          title="Print"
          options={LIST_REPORT_OPTIONS}
          defaultCode={defaultReportChoice('list')}
          onClose={() => setPrintChooserOpen(false)}
          onChoose={printResultSetReport}
        />
      )}

      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-1">
          {CASE_SAVED_FILTERS.map((f) => (
            <button
              key={f.code}
              onClick={() => {
                setFilter(f.code as CaseListParams['filter']);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filter === f.code ? 'bg-accent-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          id="case-search"
          type="text"
          placeholder="Search reference, client, subject, agent, status, type…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-96 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
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
              <th className="px-3 py-2 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('reference')}>
                File {sortIndicator('reference')}
              </th>
              <th className="px-3 py-2 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('client')}>
                Client {sortIndicator('client')}
              </th>
              <th className="px-3 py-2">Client Ref.</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Subject First</th>
              <th className="px-3 py-2">Subject Middle</th>
              <th className="px-3 py-2">Subject Last</th>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Instruction Sent</th>
              <th className="px-3 py-2 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('dateDue')}>
                Due {sortIndicator('dateDue')}
              </th>
              <th className="px-3 py-2 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('status')}>
                Status {sortIndicator('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} onClick={() => openCase(c.id)} className="cursor-pointer border-b border-slate-100 hover:bg-accent-50">
                <td className="px-3 py-2 font-medium text-slate-800">{c.reference}</td>
                <td className="px-3 py-2 text-slate-600">{c.client.company}</td>
                <td className="px-3 py-2 text-slate-600">{c.clientRef}</td>
                <td className="px-3 py-2 text-slate-600">{c.subjectTitle}</td>
                <td className="px-3 py-2 text-slate-600">{c.subjectFirstname}</td>
                <td className="px-3 py-2 text-slate-600">{c.subjectMiddlename}</td>
                <td className="px-3 py-2 text-slate-600">{c.subjectLastname}</td>
                <td className="px-3 py-2 text-slate-600">{c.agent?.name}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(c.dateInstructionSent)}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(c.dateDue)}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{c.status.name}</span>
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                  No cases found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-2 text-sm">
          <button className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
