import { useEffect } from 'react';

export interface ShortcutBinding {
  key: string;
  meta?: boolean; // Cmd on Mac / Ctrl on Windows — pass true to require Cmd/Ctrl
  handler: (e: KeyboardEvent) => void;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTypingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return EDITABLE_TAGS.has(el.tagName) || el.isContentEditable;
}

/**
 * Reproduces the source's `Keystroke` script-trigger layer — spec §11.
 * `ignoreWhileTyping` shortcuts (the default) don't fire while a form field has focus,
 * so typing "f" into a name field doesn't jump the user to the Files list.
 */
export function useKeyboardShortcuts(bindings: ShortcutBinding[], options: { ignoreWhileTyping?: boolean } = {}) {
  const { ignoreWhileTyping = true } = options;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const metaPressed = e.metaKey || e.ctrlKey;
      // A bare "f" while typing is just the letter f — ignore it. Cmd/Ctrl+F is never a
      // character the user is trying to type, so it should fire regardless of focus (matches
      // the source's Cmd+F habit, usable even mid-search).
      if (ignoreWhileTyping && !metaPressed && isTypingInField(e.target) && e.key !== 'Escape') {
        return;
      }

      for (const binding of bindings) {
        if (binding.meta && !metaPressed) continue;
        if (!binding.meta && metaPressed) continue;
        if (e.key.toLowerCase() !== binding.key.toLowerCase()) continue;

        e.preventDefault();
        binding.handler(e);
        return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindings, ignoreWhileTyping]);
}
