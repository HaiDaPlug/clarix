"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard basics for a modal: focus moves into the dialog when it opens and
 * back to whatever opened it when it closes; Escape closes it unless `busy`
 * (a request in flight shouldn't be abandoned by a stray keypress).
 * Put the returned ref on the dialog element and give it tabIndex={-1}.
 */
export function useDialogKeyboard<T extends HTMLElement>(onClose: () => void, busy = false) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => opener?.focus?.();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return ref;
}
