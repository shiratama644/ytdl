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

  it('選択時の ring クラスが付く', () => {
    render(<Chip selected>選択</Chip>);
    expect(screen.getByRole('button').className).toContain('ring-2');
  });

  it('既定 variant は filter', () => {
    render(<Chip>既定</Chip>);
    expect(screen.getByRole('button').className).toContain('bg-secondary-container/90');
  });
});
