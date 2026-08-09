import { useEffect, useRef, useState } from 'react';

export interface TypeaheadOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Reproduces §12.1: "Client and agent inputs offer type-ahead from existing records,
 * reproducing the source's field-based value lists" — not a single giant <select> (there are
 * 689 clients), a search-as-you-type picker.
 */
export function TypeaheadPicker({
  value,
  onChange,
  search,
  placeholder,
}: {
  value: TypeaheadOption | null;
  onChange: (option: TypeaheadOption | null) => void;
  search: (query: string) => Promise<TypeaheadOption[]>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<TypeaheadOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || query.trim() === '') {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      search(query).then((results) => {
        if (!cancelled) setOptions(results);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={open ? query : (value?.label ?? '')}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
      />
      {open && options.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent-50"
              onClick={() => {
                onChange(opt);
                setOpen(false);
                setQuery('');
              }}
            >
              <div className="text-slate-800">{opt.label}</div>
              {opt.sublabel && <div className="text-xs text-slate-400">{opt.sublabel}</div>}
            </li>
          ))}
        </ul>
      )}
      {value && !open && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
        >
          clear
        </button>
      )}
    </div>
  );
}
