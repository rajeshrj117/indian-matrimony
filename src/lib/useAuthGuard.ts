'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function useAuthGuard() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/auth'); return; }
    if (!profile?.profileComplete) { router.replace('/profile-setup'); return; }
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, [loading, user, profile, router]);

  return ready;
}
