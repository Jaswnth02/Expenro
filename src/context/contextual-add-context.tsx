'use client';

import React, { createContext, useContext, useRef, useCallback } from 'react';

type HandlerFn = () => void;

interface ContextualAddContextType {
  registerAddHandler: (target: string, handler: HandlerFn) => () => void;
  triggerAdd: (pathname: string, fallback?: () => void) => void;
}

const ContextualAddContext = createContext<ContextualAddContextType | null>(null);

export function ContextualAddProvider({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<Map<string, HandlerFn>>(new Map());

  const registerAddHandler = useCallback((target: string, handler: HandlerFn) => {
    handlersRef.current.set(target, handler);
    return () => {
      handlersRef.current.delete(target);
    };
  }, []);

  const triggerAdd = useCallback((pathname: string, fallback?: () => void) => {
    // Determine active target from pathname
    let target = '';
    if (pathname.startsWith('/savings')) target = 'savings';
    else if (pathname.startsWith('/income')) target = 'income';
    else if (pathname.startsWith('/meals')) target = 'meals';
    else if (pathname.startsWith('/budgets')) target = 'budgets';
    else if (pathname.startsWith('/categories')) target = 'categories';

    // 1. Direct React in-memory execution (instant, reliable, no WebKit event drop)
    if (target && handlersRef.current.has(target)) {
      const handler = handlersRef.current.get(target);
      if (handler) {
        handler();
        return;
      }
    }

    // 2. Window event broadcast as secondary layer
    if (typeof window !== 'undefined' && target) {
      window.dispatchEvent(new CustomEvent('expenro:trigger-add', { detail: { target } }));
    }

    // 3. Fallback to global Quick Add Expense if not on a specialized page
    if (!target && fallback) {
      fallback();
    }
  }, []);

  return (
    <ContextualAddContext.Provider value={{ registerAddHandler, triggerAdd }}>
      {children}
    </ContextualAddContext.Provider>
  );
}

export function useContextualAdd() {
  const context = useContext(ContextualAddContext);
  if (!context) {
    throw new Error('useContextualAdd must be used within ContextualAddProvider');
  }
  return context;
}
