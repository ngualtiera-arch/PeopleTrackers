import { useNavigate } from 'react-router-dom';

/**
 * Reproduces the action bar shared by the Files/Clients/Agents list and detail screens —
 * §9.3/§9.5/§9.7: "Main Menu · Files · Agents · Clients · < · > · Find · New · Delete · Print".
 * (The source's separate "View" button is folded into row-click-to-open, since that's the same
 * user action on the web — clicking a row already opens it.)
 */
export function ActionBar({
  onFind,
  onNew,
  onDelete,
  onPrint,
  onPrev,
  onNext,
  prevNextLabel,
  deleteDisabled,
}: {
  onFind?: () => void;
  onNew?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevNextLabel?: string;
  deleteDisabled?: boolean;
}) {
  const navigate = useNavigate();

  const buttonClass =
    'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white';

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <button className={buttonClass} onClick={() => navigate('/')}>
          Main Menu
        </button>
        <button className={buttonClass} onClick={() => navigate('/files')}>
          Files
        </button>
        <button className={buttonClass} onClick={() => navigate('/agents')}>
          Agents
        </button>
        <button className={buttonClass} onClick={() => navigate('/clients')}>
          Clients
        </button>
        {(onPrev || onNext) && (
          <div className="ml-2 flex items-center gap-1 border-l border-slate-200 pl-2">
            <button className={buttonClass} onClick={onPrev} disabled={!onPrev} aria-label="Previous">
              &lt;
            </button>
            {prevNextLabel && <span className="px-1 text-xs text-slate-500">{prevNextLabel}</span>}
            <button className={buttonClass} onClick={onNext} disabled={!onNext} aria-label="Next">
              &gt;
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onFind && (
          <button className={buttonClass} onClick={onFind}>
            Find
          </button>
        )}
        {onNew && (
          <button className={buttonClass} onClick={onNew}>
            New
          </button>
        )}
        {onDelete && (
          <button className={buttonClass} onClick={onDelete} disabled={deleteDisabled}>
            Delete
          </button>
        )}
        {onPrint && (
          <button className={buttonClass} onClick={onPrint}>
            Print
          </button>
        )}
      </div>
    </div>
  );
}
