'use client';

import BottomNav from '@/components/BottomNav';
import { useAuthGuard } from '@/lib/useAuthGuard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const ready = useAuthGuard();
  if (!ready) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
