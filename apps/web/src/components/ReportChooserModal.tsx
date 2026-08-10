import { useState } from 'react';

export interface ReportChooserOption {
  code: string;
  label: string;
}

/** Report chooser — §13.4. A selector plus a Print action; scope is fixed by the caller (which
 *  screen opened it), not user-switchable here — see CaseDetailPage/FilesListPage comments. */
export function ReportChooserModal({
  title,
  options,
  defaultCode,
  onChoose,
  onExportCsv,
  onClose,
}: {
  title: string;
  options: ReportChooserOption[];
  defaultCode: string;
  onChoose: (code: string) => void;
  onExportCsv?: (code: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(defaultCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-80 rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.code} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name="report-choice" checked={selected === opt.code} onChange={() => setSelected(opt.code)} />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={onClose}>
            Cancel
          </button>
          {onExportCsv && (
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => onExportCsv(selected)}
            >
              Save as CSV
            </button>
          )}
          <button
            className="rounded-md bg-accent-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-700"
            onClick={() => onChoose(selected)}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
