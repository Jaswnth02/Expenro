'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/branding/logo';
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { loginSchema } from '@/lib/validations/auth';
import { useAuth } from '@/context/auth-context';
import { loginAction } from '@/lib/actions/auth';

export default function LoginPage() {
  const { signIn, signInAsDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-detect and prefill if query parameters were submitted via native browser GET
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlEmail = searchParams.get('email');
      const urlPassword = searchParams.get('password');

      if (urlEmail || urlPassword) {
        if (urlEmail) {
          setEmail(urlEmail.trim());
        }
        if (urlPassword) {
          setPassword(urlPassword);
        }
        // Scrub credentials from URL bar immediately for privacy/security
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const performLogin = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = targetEmail.trim();

    const validation = loginSchema.safeParse({ email: cleanEmail, password: targetPassword });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      setLoading(false);
      return;
    }

    try {
      // 1. Authenticate via signIn which runs loginAction and syncs auth state
      const { error: signInError } = await signIn(cleanEmail, targetPassword);
      if (signInError) {
        setError(signInError.message || 'Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      // 3. Clear any legacy demo cookie
      if (typeof document !== 'undefined') {
        document.cookie = 'expenro_demo_user=; path=/; max-age=0;';
      }

      setSuccessMsg('Signing in successfully! Redirecting...');

      // 4. Hard navigation ensures mobile browsers send fresh session cookies to /dashboard SSR
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
      setError(msg);
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);
    await performLogin(email, password);
  };

  const handleDemoLogin = () => {
    signInAsDemo();
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-8 sm:py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center text-center">
        <Logo size="lg" showTagline />
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Welcome back to EXPENRO
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Sign in to take full control of your finances
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-zinc-900 py-6 px-5 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:px-10">


          <form
            className="space-y-4"
            method="POST"
            action="#"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(e);
            }}
          >
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="standard-login-submit"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 active:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Demo One-Click Access */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-semibold text-[11px]">
                  Or Demo Mode
                </span>
              </div>
            </div>

            <button
              type="button"
              id="demo-student-login-btn"
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Continue with Demo Student Account</span>
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Create one
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
