import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';

export default function NotFound() {
  return (
    <div className="grid place-items-center py-32 text-center">
      <div className="grid place-items-center h-20 w-20 rounded-m3-xxl bg-surface-container-high text-on-surface-variant mb-4">
        <Icon name="close" size={40} />
      </div>
      <h1 className="text-display-small">404</h1>
      <p className="mt-2 max-w-md text-body-medium text-on-surface-variant">
        ページが見つかりませんでした。
      </p>
      <Link href="/" className="mt-6">
        <Button variant="tonal">ホームへ戻る</Button>
      </Link>
    </div>
  );
}
