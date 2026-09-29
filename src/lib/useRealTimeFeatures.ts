'use client';

import { useEffect, useState } from 'react';
import { updateOnlineStatus, listenUndeliveredMessagesForUser, listenUserPresence, listenMatches, listenActivityNotifications, type PresenceInfo } from '@/lib/firestore';

export function useOnlinePresence(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;

    // Set user as online
    updateOnlineStatus(uid, true);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      updateOnlineStatus(uid, isVisible);
    };

    // Handle window close
    const handleBeforeUnload = () => {
      updateOnlineStatus(uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Sync presence across tabs
    const channel = new BroadcastChannel('user-presence');
    
    channel.postMessage({ type: 'online', uid });

    channel.onmessage = (event) => {
      if (event.data.type === 'online' && event.data.uid === uid) {
        // User is active in another tab, keep status synced
        updateOnlineStatus(uid, true);
      }
    };

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      channel.close();
      updateOnlineStatus(uid, false);
    };
  }, [uid]);
}

// Marks incoming messages "delivered" the moment this device sees them in realtime — app-wide,
// not just inside an open chat. Mount this once near the root (for any signed-in user) so the
// gray double-check appears promptly even before the recipient opens that specific conversation.
export function useMessageDelivery(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    const unsub = listenUndeliveredMessagesForUser(uid);
    return unsub;
  }, [uid]);
}

// Keeps online/last-seen badges live for a set of profiles — e.g. the cards currently
// visible on Discover or Explore. Those lists come from a one-time query (getCandidates /
// getLikesReceived), so without this the "Online" badge would just freeze at whatever it
// was when the list loaded. Pass only the uids actually on screen; listeners are added and
// torn down as that set changes.
export function useLivePresence(uids: (string | undefined)[]): Record<string, PresenceInfo> {
  const key = uids.filter((u): u is string => Boolean(u)).join(',');
  const [presence, setPresence] = useState<Record<string, PresenceInfo>>({});

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;
    const unsubs = ids.map((uid) => listenUserPresence(uid, (info) => {
      setPresence((prev) => ({ ...prev, [uid]: info }));
    }));
    return () => {
      unsubs.forEach((unsub) => unsub());
      // Drop the ids we were watching so a stale badge doesn't linger once they
      // scroll/swipe past; presence for the next set streams back in as it loads.
      setPresence((prev) => {
        const next = { ...prev };
        ids.forEach((uid) => { delete next[uid]; });
        return next;
      });
    };
  }, [key]);

  return presence;
}

// Badge count for the Chats tab: matches whose last message wasn't sent by this
// user and hasn't been read yet (per MatchDoc.lastReadAt semantics — see types.ts).
export function useUnreadChatsCount(uid: string | undefined): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }
    const unsub = listenMatches(uid, (matches) => {
      const unread = matches.filter(
        (m) => m.lastMessageFrom && m.lastMessageFrom !== uid && m.lastMessageAt > (m.lastReadAt?.[uid] ?? 0)
      ).length;
      setCount(unread);
    });
    return unsub;
  }, [uid]);

  return count;
}

// Badge count for the Discover tab: unread activity notifications (likes, matches,
// superlikes) for this user.
export function useUnreadActivityCount(uid: string | undefined): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }
    const unsub = listenActivityNotifications(uid, (notifications) => {
      setCount(notifications.filter((n) => !n.read).length);
    });
    return unsub;
  }, [uid]);

  return count;
}

export function useTypingTimeout(
  isTyping: boolean,
  onTypingChange: (typing: boolean) => void,
  delayMs: number = 3000
) {
  useEffect(() => {
    if (!isTyping) return;

    const timer = setTimeout(() => {
      onTypingChange(false);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isTyping, onTypingChange, delayMs]);
}