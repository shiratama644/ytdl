'use client';

import { forwardRef } from 'react';

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-m3-full font-label font-medium transition-colors duration-200 select-none whitespace-nowrap disabled:opacity-60 disabled:pointer-events-none';

const variantClasses: Record<Variant, string> = {
  filled: 'bg-primary text-on-primary hover:brightness-95',
  tonal: 'bg-secondary-container text-on-secondary-container hover:brightness-95',
  outlined: 'border border-outline text-primary hover:bg-primary/10',
  text: 'text-primary hover:bg-primary/10',
  elevated: 'bg-surface-container-high text-on-surface shadow-m3-elevation-1 hover:shadow-m3-elevation-2',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-label-large',
  md: 'h-11 px-6 text-label-large',
  lg: 'h-14 px-8 text-title-medium',
};

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}>(
  (
    { variant = 'filled', size = 'md', className = '', children, ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
