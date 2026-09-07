import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('子要素を表示する', () => {
    render(<Button>クリック</Button>);
    expect(screen.getByRole('button', { name: 'クリック' })).toBeInTheDocument();
  });

  it('既定 variant は filled、既定 size は md', () => {
    render(<Button>ボタン</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary');
    expect(btn.className).toContain('h-11');
  });

  it('variant / size を指定するとクラスに反映される', () => {
    render(<Button variant="outlined" size="sm">OK</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-outline');
    expect(btn.className).toContain('h-9');
  });

  it('disabled 属性を引き継ぐ', () => {
    render(<Button disabled>無効</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('クリック時に onClick が発火する', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>押す</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('className を追加できる', () => {
    render(<Button className="extra">x</Button>);
    expect(screen.getByRole('button').className).toContain('extra');
  });
});
