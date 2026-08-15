import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

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
  onBatchPdf,
  onPrev,
  onNext,
  prevNextLabel,
  deleteDisabled,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: {
  onFind?: () => void;
  onNew?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
  onBatchPdf?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  prevNextLabel?: string;
  deleteDisabled?: boolean;
  // A second search box, up here next to Main Menu/Files/Agents/Clients — list pages only, kept
  // in sync with the same search state as that page's own (larger, filter-adjacent) search box
  // rather than being a separate search of its own.
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const navigate = useNavigate();

  // Cmd/Ctrl+F, everywhere — reproduces the source's most habitual shortcut: "go back to the
  // Files screen with a clean, blank find" (§11). Fires from any screen the ActionBar renders
  // on, not just the Files list, and works even mid-typing (see useKeyboardShortcuts).
  useKeyboardShortcuts([{ key: 'f', meta: true, handler: () => navigate(`/files?reset=${Date.now()}`) }]);

  const buttonClass =
    'rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10';

  return (
    <div className="flex items-center justify-between bg-[#1e3a5f] px-4 py-2">
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
          <div className="ml-2 flex items-center gap-1 border-l border-white/20 pl-2">
            <button className={buttonClass} onClick={onPrev} disabled={!onPrev} aria-label="Previous">
              &lt;
            </button>
            {prevNextLabel && <span className="px-1 text-xs text-white/70">{prevNextLabel}</span>}
            <button className={buttonClass} onClick={onNext} disabled={!onNext} aria-label="Next">
              &gt;
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onSearchChange && (
          <input
            type="text"
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? 'Search…'}
            className="w-56 rounded-md border border-white/20 bg-white px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        )}
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
        {onBatchPdf && (
          <button className={buttonClass} onClick={onBatchPdf}>
            Batch PDF
          </button>
        )}
      </div>
    </div>
  );
}
