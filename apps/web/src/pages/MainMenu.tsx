import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Reproduces the existing main menu exactly — module buttons, nothing else. §9.2.
// No dashboard tiles, counts, charts or activity panels: the source main menu has none.
export function MainMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useKeyboardShortcuts([
    { key: 'f', handler: () => navigate('/files') },
    { key: 'a', handler: () => navigate('/agents') },
    { key: 'c', handler: () => navigate('/clients') },
  ]);

  const buttons = [
    { label: 'Files', to: '/files' },
    { label: 'Clients', to: '/clients' },
    { label: 'Agents', to: '/agents' },
    ...(user?.role === 'admin' ? [{ label: 'Settings', to: '/settings' }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-base font-semibold text-slate-900">People Trackers Australia</h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{user?.email}</span>
          <button onClick={() => logout()} className="text-accent-600 hover:underline">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <nav className="grid grid-cols-2 gap-4">
          {buttons.map((b) => (
            <button
              key={b.to}
              onClick={() => navigate(b.to)}
              className="flex h-28 w-40 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm transition hover:border-accent-500 hover:text-accent-700"
            >
              {b.label}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
