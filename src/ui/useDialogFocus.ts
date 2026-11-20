import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1,
  );
}

export interface UseDialogFocusOptions {
  readonly open: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly trapFocus: boolean;
  readonly suspended?: boolean;
  readonly onClose: () => void;
}

/**
 * Gerencia acessibilidade de teclado (WCAG 2.2 AA 2.1.2 / 2.4.3) para modais e gaveta:
 * - Move foco inicial ao abrir
 * - Opcionalmente aplica focus trap (Tab / Shift+Tab) em modais
 * - Fecha com Esc (respeitando camadas superiores via `suspended`)
 * - Restaura foco ao elemento acionador ao fechar
 */
export function useDialogFocus({
  open,
  containerRef,
  initialFocusRef,
  returnFocusRef,
  trapFocus,
  suspended = false,
  onClose,
}: UseDialogFocusOptions): void {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const activeElement = document.activeElement;
      previouslyFocusedRef.current =
        activeElement instanceof HTMLElement ? activeElement : null;

      const focusTarget = (): void => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
          return;
        }
        const container = containerRef.current;
        if (!container) {
          return;
        }
        const focusables = getFocusableElements(container);
        const first = focusables[0];
        if (first) {
          first.focus();
        } else {
          container.focus();
        }
      };

      focusTarget();
      return undefined;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const targetToRestore =
        returnFocusRef?.current ?? previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (targetToRestore && targetToRestore.isConnected) {
        targetToRestore.focus();
      }
    }
    return undefined;
  }, [open, containerRef, initialFocusRef, returnFocusRef]);

  useEffect(() => {
    if (!open || suspended) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (!trapFocus || event.key !== 'Tab') {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) {
        return;
      }

      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, suspended, trapFocus, containerRef, onClose]);
}
