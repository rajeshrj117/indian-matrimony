'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  sendInterest, respondToInterest, withdrawInterest, addToShortlist, removeFromShortlist, matchIdFor,
} from '@/lib/firestore';
import { notify } from '@/lib/notify';
import type { Profile } from '@/lib/types';

// Shared handlers for the Send Interest -> Accept / Decline flow, so the search results,
// the Interests inbox and the full profile page all behave (and notify) identically.
export function useInterestActions() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const run = useCallback(async (uid: string, fn: () => Promise<void>) => {
    if (!user || !profile) return;
    setBusyUid(uid);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      flash(err instanceof Error ? err.message : 'Something went wrong. Check your connection and try again.');
    } finally {
      setBusyUid(null);
    }
  }, [user, profile, flash]);

  const send = useCallback((target: Pick<Profile, 'uid' | 'name'>, message?: string) =>
    run(target.uid, async () => {
      const res = await sendInterest(user!.uid, target.uid, { message, isPremium: Boolean(profile!.premium) });
      if (res.kind === 'accepted') {
        void notify({ toUid: target.uid, type: 'accepted', matchId: res.match.id });
        flash(`You and ${target.name} are now connected. You can chat.`);
      } else {
        void notify({ toUid: target.uid, type: 'interest' });
        flash(`Interest sent to ${target.name}`);
      }
    }), [run, user, profile, flash]);

  const accept = useCallback((from: Pick<Profile, 'uid' | 'name'>) =>
    run(from.uid, async () => {
      const match = await respondToInterest(from.uid, user!.uid, true);
      void notify({ toUid: from.uid, type: 'accepted', matchId: match?.id });
      flash(`You accepted ${from.name}'s interest`);
    }), [run, user, flash]);

  const decline = useCallback((from: Pick<Profile, 'uid' | 'name'>) =>
    run(from.uid, async () => {
      await respondToInterest(from.uid, user!.uid, false);
      flash('Interest declined');
    }), [run, user, flash]);

  const withdraw = useCallback((to: Pick<Profile, 'uid' | 'name'>) =>
    run(to.uid, async () => {
      await withdrawInterest(user!.uid, to.uid);
      flash('Interest withdrawn');
    }), [run, user, flash]);

  const toggleShortlist = useCallback((target: Pick<Profile, 'uid' | 'name'>, isShortlisted: boolean) =>
    run(target.uid, async () => {
      if (isShortlisted) {
        await removeFromShortlist(user!.uid, target.uid);
        flash('Removed from shortlist');
      } else {
        await addToShortlist(user!.uid, target.uid);
        flash(`${target.name} added to your shortlist`);
      }
    }), [run, user, flash]);

  const openChat = useCallback((otherUid: string) => {
    if (!user) return;
    router.push(`/chat/${matchIdFor(user.uid, otherUid)}`);
  }, [router, user]);

  return { busyUid, toast, send, accept, decline, withdraw, toggleShortlist, openChat };
}
