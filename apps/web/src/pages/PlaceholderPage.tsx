import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

/** Stands in for Files/Clients/Agents/Settings until their phase (§23) builds the real screen. */
export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  const navigate = useNavigate();

  useKeyboardShortcuts([{ key: 'Escape', handler: () => navigate('/') }]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <button onClick={() => navigate('/')} className="text-sm text-accent-600 hover:underline">
          ← Main Menu
        </button>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-lg font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-sm">Built in {phase}.</p>
        </div>
      </main>
    </div>
  );
}
