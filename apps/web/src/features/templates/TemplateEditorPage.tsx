import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { REPORT_TEMPLATES } from '@peopletrackers/shared';
import { apiFetch } from '../../lib/api-client';
import { ActionBar } from '../../components/ActionBar';

interface ReportTemplate {
  code: string;
  name: string;
  body: string;
}

/** Report template editor — §9.9. Five boilerplate bodies, seeded empty pending §22 content. */
export function TemplateEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => apiFetch<ReportTemplate[]>('/report-templates'),
  });

  const [bodies, setBodies] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      setBodies(Object.fromEntries(data.map((t) => [t.code, t.body])));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: ({ code, body }: { code: string; body: string }) =>
      apiFetch(`/report-templates/${code}`, { method: 'PUT', body: JSON.stringify({ body }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report-templates'] }),
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f4f2]">
      <ActionBar />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Report Templates</h1>
          <button className="text-sm text-accent-600 hover:underline" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {REPORT_TEMPLATES.map((t) => (
          <section key={t.code} className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">{t.buttonLabel}</h2>
              <button
                className="rounded-md bg-accent-600 px-3 py-1 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate({ code: t.code, body: bodies[t.code] ?? '' })}
              >
                Save
              </button>
            </div>
            <textarea
              className="min-h-40 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              value={bodies[t.code] ?? ''}
              onChange={(e) => setBodies((b) => ({ ...b, [t.code]: e.target.value }))}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
