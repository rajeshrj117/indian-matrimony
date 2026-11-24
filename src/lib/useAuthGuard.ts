'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Redirects away unless the visitor is signed in with a completed profile, and reports
// whether the protected screen can render yet.
export function useAuthGuard() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/auth'); return; }
    if (!profile?.profileComplete) { router.replace('/profile-setup'); return; }
  }, [loading, user, profile, router]);

  return !loading && Boolean(user) && Boolean(profile?.profileComplete);
}
