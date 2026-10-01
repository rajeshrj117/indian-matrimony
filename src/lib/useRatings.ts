'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getRatingBundle, submitRating } from '@/lib/firestore';
import type { Profile, RatingDoc, RatingSummary } from '@/lib/types';

export type RatingEntry = { summary: RatingSummary; mine: RatingDoc | null };

// Loads rating summaries (+ my own rating) for the profiles currently on screen, once each.
export function useRatings(myUid: string | undefined, myGender: Profile['gender'] | undefined, uids: string[]) {
  const [data, setData] = useState<Record<string, RatingEntry>>({});
  const requested = useRef<Set<string>>(new Set());
  const key = uids.join(',');

  useEffect(() => {
    if (!myUid) return;
    const todo = key.split(',').filter((u) => u && !requested.current.has(u));
    todo.forEach((u) => requested.current.add(u));
    todo.forEach((u) => {
      getRatingBundle(u, myUid)
        .then((entry) => setData((d) => ({ ...d, [u]: entry })))
        .catch(() => requested.current.delete(u));
    });
  }, [key, myUid]);

  const save = useCallback(
    async (targetUid: string, values: { likes: number; stars?: number }) => {
      if (!myUid) return;
      await submitRating(myUid, targetUid, myGender ?? 'Other', values);
      const entry = await getRatingBundle(targetUid, myUid);
      setData((d) => ({ ...d, [targetUid]: entry }));
    },
    [myUid, myGender]
  );

  // Heart on the photo: liked = likes score 10, un-liked = 0. Keeps any star rating a woman gave.
  const toggleLike = useCallback(
    async (targetUid: string) => {
      const cur = data[targetUid]?.mine ?? null;
      const liked = (cur?.likes ?? 0) > 0;
      await save(targetUid, {
        likes: liked ? 0 : 10,
        ...(myGender === 'Female' && cur?.stars !== undefined ? { stars: cur.stars } : {}),
      });
    },
    [data, save, myGender]
  );

  return { data, save, toggleLike };
}
