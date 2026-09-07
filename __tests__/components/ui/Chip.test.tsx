import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from '@/components/ui/Chip';

describe('Chip', () => {
  it('子要素を表示する', () => {
    render(<Chip>フィルタ</Chip>);
    expect(screen.getByRole('button', { name: 'フィルタ' })).toBeInTheDocument();
  });

  it('selected 時に aria-pressed=true を付与する', () => {
    render(<Chip selected>選択済み</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('未選択時は aria-pressed=false', () => {
    render(<Chip>未選択</Chip>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('選択時に primary 面でハイライトする', () => {
    render(<Chip selected>選択</Chip>);
    expect(screen.getByRole('button').className).toContain('bg-primary');
    expect(screen.getByRole('button').className).toContain('text-on-primary');
  });

  it('既定 variant は filter ベース面', () => {
    render(<Chip>既定</Chip>);
    expect(screen.getByRole('button').className).toContain('bg-surface-container-high');
    expect(screen.getByRole('button').className).toContain('text-on-surface-variant');
  });
});
