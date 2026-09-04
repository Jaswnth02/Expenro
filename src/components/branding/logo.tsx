import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export function Logo({
  className = '',
  showTagline = false,
  size = 'md',
  href = '/dashboard',
}: LogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-12 h-12 text-xl',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Icon: Minimal geometric chevron/delta with upward financial growth momentum */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white font-bold shadow-md shadow-emerald-500/20 ring-1 ring-white/20`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-1/2 h-1/2"
        >
          <path d="M4 16l6-6 4 4 6-8" />
          <path d="M14 6h6v6" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span
            className={`${textSizes[size]} font-extrabold tracking-tight text-zinc-900 dark:text-white uppercase`}
          >
            EXPEN<span className="text-emerald-500 dark:text-emerald-400">RO</span>
          </span>
        </div>
        {showTagline && (
          <span className="text-[10px] tracking-widest text-zinc-500 dark:text-zinc-400 font-medium uppercase">
            Track. Spend. Save.
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
