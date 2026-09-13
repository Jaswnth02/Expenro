'use client';

import { useEffect, useCallback } from 'react';

export const TRIGGER_ADD_EVENT = 'expenro:trigger-add';

export type ContextualAddTarget = 'savings' | 'income' | 'meals' | 'budgets' | 'categories' | 'expenses' | 'default';

export interface TriggerAddDetail {
  target: ContextualAddTarget;
}

/**
 * Triggers a contextual add action for the active page, or falls back to standard quick add.
 */
export function triggerContextualAdd(pathname: string, fallback?: () => void) {
  if (typeof window === 'undefined') return;

  if (pathname.startsWith('/savings')) {
    window.dispatchEvent(new CustomEvent<TriggerAddDetail>(TRIGGER_ADD_EVENT, { detail: { target: 'savings' } }));
  } else if (pathname.startsWith('/income')) {
    window.dispatchEvent(new CustomEvent<TriggerAddDetail>(TRIGGER_ADD_EVENT, { detail: { target: 'income' } }));
  } else if (pathname.startsWith('/meals')) {
    window.dispatchEvent(new CustomEvent<TriggerAddDetail>(TRIGGER_ADD_EVENT, { detail: { target: 'meals' } }));
  } else if (pathname.startsWith('/budgets')) {
    window.dispatchEvent(new CustomEvent<TriggerAddDetail>(TRIGGER_ADD_EVENT, { detail: { target: 'budgets' } }));
  } else if (pathname.startsWith('/categories')) {
    window.dispatchEvent(new CustomEvent<TriggerAddDetail>(TRIGGER_ADD_EVENT, { detail: { target: 'categories' } }));
  } else if (fallback) {
    fallback();
  }
}

/**
 * React hook that registers a listener on the current page for the floating mobile Add button.
 */
export function useContextualAddListener(
  target: ContextualAddTarget,
  onTrigger: () => void
) {
  const handler = useCallback(
    (e: Event) => {
      const customEvent = e as CustomEvent<TriggerAddDetail>;
      if (!customEvent.detail || customEvent.detail.target === target) {
        onTrigger();
      }
    },
    [target, onTrigger]
  );

  useEffect(() => {
    window.addEventListener(TRIGGER_ADD_EVENT, handler);
    return () => window.removeEventListener(TRIGGER_ADD_EVENT, handler);
  }, [handler]);
}
