'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client error boundary:', error);
  }, [error]);

  return (
    <div className="grid place-items-center py-32 text-center">
      <div className="grid place-items-center h-16 w-16 rounded-m3-xl bg-error-container text-on-error-container mb-4">
        <Icon name="close" size={32} />
      </div>
      <h2 className="text-title-large">エラーが発生しました</h2>
      <p className="mt-2 max-w-md text-body-medium text-on-surface-variant">
        {error.message || '予期しないエラーです。'}
      </p>
      {error.digest && <p className="mt-1 text-label-small text-on-surface-variant">ID: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        再試行
      </Button>
    </div>
  );
}
