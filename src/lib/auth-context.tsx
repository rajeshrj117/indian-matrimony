'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getProfile, migrateLegacyProfile } from '@/lib/firestore';
import { mergeProfile } from '@/lib/profile-fields';
import type { Profile } from '@/lib/types';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual re-fetch, kept for backwards compatibility with existing call sites.
  // Not required for correctness anymore — the onSnapshot listener below keeps
  // `profile` live — but harmless to leave in as an explicit "sync now" escape hatch.
  const refreshProfile = async () => {
    if (!auth.currentUser) { setProfile(null); return; }
    const p = await getProfile(auth.currentUser.uid);
    setProfile(p);
  };

  useEffect(() => {
    let unsubPub: (() => void) | undefined;
    let unsubPriv: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      // Tear down any previous user's listeners before attaching new ones.
      unsubPub?.();
      unsubPriv?.();
      unsubPub = unsubPriv = undefined;

      setUser(u);

      if (u) {
        // The profile is split across two docs: users/{uid} (public) and userPrivate/{uid}
        // (owner-only: phone, email, exact location, block list, push tokens, premium...).
        // Merge them so the rest of the app keeps seeing one `Profile`.
        let pub: Record<string, unknown> | null = null;
        let priv: Record<string, unknown> | undefined;
        let pubReady = false;
        let privReady = false;
        let migrated = false;
        const emit = () => {
          setProfile(pub ? (mergeProfile(pub, priv) as unknown as Profile) : null);
          if (pubReady && privReady) setLoading(false);
        };

        unsubPub = onSnapshot(
          doc(db, 'users', u.uid),
          (snap) => {
            pub = snap.exists() ? snap.data() : null;
            pubReady = true;
            // Accounts created before the split still carry phone/email/exact location on the
            // public doc — move them to userPrivate once, right after sign-in.
            if (pub && !migrated) {
              migrated = true;
              migrateLegacyProfile(u.uid).catch((err) => console.error('Legacy profile migration failed', err));
            }
            emit();
          },
          () => {
            pub = null;
            pubReady = true;
            emit();
          }
        );
        unsubPriv = onSnapshot(
          doc(db, 'userPrivate', u.uid),
          (snap) => {
            priv = snap.exists() ? snap.data() : undefined;
            privReady = true;
            emit();
          },
          () => {
            priv = undefined;
            privReady = true;
            emit();
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubPub?.();
      unsubPriv?.();
      unsubAuth();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);