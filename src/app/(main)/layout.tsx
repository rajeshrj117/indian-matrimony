'use client';

import BottomNav from '@/components/BottomNav';
import { useAuthGuard } from '@/lib/useAuthGuard';
import AppLoader from '@/components/AppLoader';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const ready = useAuthGuard();
  // Same loader as the start screen, so there is no blank flash or second loader in between.
  if (!ready) return <AppLoader />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
