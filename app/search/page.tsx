import { Suspense } from 'react';
import { SearchClient } from '@/components/SearchClient';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-6"><div className="h-10 w-1/2 rounded-m3-md bg-surface-container-high" /></div>}>
      <SearchClient />
    </Suspense>
  );
}
