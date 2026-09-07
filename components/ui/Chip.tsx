'use client';

import { forwardRef } from 'react';
import { Icon, type IconName } from './icons';

type ChipVariant = 'filter' | 'assist' | 'elevated' | 'suggestion';

const variantClasses: Record<ChipVariant, string> = {
  filter: 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest',
  assist: 'bg-surface-container-high text-on-surface',
  elevated: 'bg-surface-container-low shadow-soft text-on-surface',
  suggestion: 'bg-surface-container text-on-surface hover:brightness-95',
};

export const Chip = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ChipVariant;
  icon?: IconName;
  selected?: boolean;
}>(
  (
    { variant = 'filter', icon, selected = false, children, className = '', ...rest },
    ref,
  ) => (
    <button
      ref={ref}
      aria-pressed={selected}
      className={`inline-flex items-center gap-2 h-9 px-4 rounded-m3-md text-label-large whitespace-nowrap transition-all duration-200 ${variantClasses[variant]} ${
        selected ? 'bg-primary text-on-primary shadow-soft' : ''
      } ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  ),
);

Chip.displayName = 'Chip';
