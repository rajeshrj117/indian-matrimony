'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, MoreVertical, CheckCheck, Smile, Send, Ban, Flag, VolumeX, Volume2, Sparkles, Loader2, Check,
  Reply, Pencil, Trash2, X, ShieldCheck, ChevronRight, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authedFetch } from '@/lib/api-client';
import {
  getMatch, getProfile, listenMessages, sendMessage, blockUser, reportUser, muteMatch, unmuteMatch,
  setTypingStatus, listenTypingStatus, markMessagesAsRead, listenUserPresence, toggleReaction,
  editMessage, unsendMessage, RateLimitError, BlockedError, ContentPolicyError, ChatLockedError, getChatLockStatus, MAX_MESSAGES_PER_WINDOW, isBlockedEitherWay, isVerified,
} from '@/lib/firestore';
import { useOnlinePresence, useTypingTimeout } from '@/lib/useRealTimeFeatures';
import { notify } from '@/lib/notify';
import { MESSAGE_REACTIONS } from '@/lib/types';
import type { MatchDoc, MessageDoc, Profile, ReportReason } from '@/lib/types';
import { getSoundPref, setSoundPref, playSend, playReceive, playHeart, playTap } from '@/lib/sound';

const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'fake_profile', label: 'Fake profile' },
  { id: 'inappropriate', label: 'Inappropriate photos or bio' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'underage', label: 'Underage user' },
  { id: 'other', label: 'Something else' },
];

// Small curated set for the composer's emoji picker — deliberately not pulling in an
// emoji-picker dependency for this. Distinct from MESSAGE_REACTIONS (types.ts), which is
// just the 6 quick-tap reactions on a message bubble.
const EMOJI_PICKER_SET = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😎',
  '🥳', '😢', '😭', '😡', '🤯', '😴', '🙄', '😇', '🤩', '😏',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '✌️', '🤞', '👋',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💔',
  '🔥', '✨', '💯', '🎉', '🎂', '☕', '🍕', '🍷', '🌹', '🌙',
];

// `hidden` is true when either party has last-seen hidden (reciprocal, WhatsApp-style):
// they don't get an exact time from you, and you don't get one from them.
const formatLastSeen = (timestamp?: number, hidden?: boolean): string => {
  if (hidden) return 'Offline';
  if (!timestamp) return 'Offline';
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Active now';
  if (mins < 60) return `Active ${mins}m ago`;
  if (hours < 24) return `Active ${hours}h ago`;
  if (days < 7) return `Active ${days}d ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatMessageTime = (timestamp: number, prevTimestamp?: number): { time: string; showDate: boolean } => {
  const now = Date.now();
  const date = new Date(timestamp);
  const daysDiff = Math.floor((now - timestamp) / 86400000);
  
  // Show date if it's from a different day or it's been more than 1 day
  const showDate = !prevTimestamp || daysDiff > 0 || new Date(prevTimestamp).getDate() !== date.getDate();
  
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = daysDiff === 0 ? 'Today' : daysDiff === 1 ? 'Yesterday' : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  return { time: showDate ? `${dateStr} ${time}` : time, showDate };
};

export default function ChatDetailScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile: myProfile, refreshProfile } = useAuth();

  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [input, setInput] = useState('');
  const [showBlock, setShowBlock] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  // Set when 5 warnings for sexual or abusive messages lock this user's chat.
  const [chatLockedUntil, setChatLockedUntil] = useState<number | null>(null);
  const chatLocked = Boolean(chatLockedUntil && chatLockedUntil > Date.now());
  const composerDisabled = chatLocked || Boolean(rateLimitedUntil && rateLimitedUntil > Date.now());
  const [nowTick, setNowTick] = useState(Date.now());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsOnline, setOtherIsOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<number | undefined>();
  const [otherHidesLastSeen, setOtherHidesLastSeen] = useState(false);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageDoc | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unsendConfirmFor, setUnsendConfirmFor] = useState<string | null>(null);
  const [soundOn, setSoundOnState] = useState(true);
  const [sendBounce, setSendBounce] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const prevMsgCountRef = useRef<number | null>(null);
  const burstIdRef = useRef(0);

  const isMuted = Boolean(myProfile?.mutedMatches?.includes(id));

  // Sound preference — read from localStorage once mounted (avoids SSR/client mismatch).
  useEffect(() => {
    setSoundOnState(getSoundPref());
  }, []);

  const toggleSound = () => {
    setSoundOnState((prev) => {
      const next = !prev;
      setSoundPref(next);
      return next;
    });
  };

  // Little floating burst (reaction emoji) that rises and fades near the composer.
  const spawnBurst = (emoji: string) => {
    const burstId = burstIdRef.current++;
    const left = 20 + Math.random() * 60;
    setBursts((prev) => [...prev, { id: burstId, emoji, left }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 1100);
  };

  // Online presence tracking
  useOnlinePresence(user?.uid);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const m = await getMatch(id);
      if (!m || cancelled) return;
      const otherUid = m.users.find((u) => u !== user.uid);
      if (!otherUid) return;
      // Fetch a fresh copy of both profiles (rather than trusting the auth-context
      // `profile`, which may not have caught up yet) so a direct link/bookmark to a
      // chat with someone blocked — in either direction — bounces back instead of
      // opening.
      const [p, me] = await Promise.all([getProfile(otherUid), getProfile(user.uid)]);
      if (cancelled) return;
      if (isBlockedEitherWay(me, p)) {
        router.replace('/chats');
        return;
      }
      setMatch(m);
      setOther(p);
    })();
    return () => { cancelled = true; };
  }, [id, user]);

  useEffect(() => {
    const unsub = listenMessages(id, (msgs) => {
      // Play a soft receive chime for genuinely new incoming messages — skipped on the
      // very first load of the thread, and skipped for messages we sent ourselves.
      if (prevMsgCountRef.current !== null && msgs.length > prevMsgCountRef.current) {
        const newest = msgs[msgs.length - 1];
        if (newest && newest.from !== user?.uid) playReceive();
      }
      prevMsgCountRef.current = msgs.length;
      setMessages(msgs);
      // Mark messages as read when they arrive
      if (user?.uid) {
        markMessagesAsRead(id, user.uid).catch(console.error);
      }
    });
    return unsub;
  }, [id, user?.uid]);

  useEffect(() => {
    const unsub = listenTypingStatus(id, setTypingUsers);
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!other?.uid) return;
    const unsub = listenUserPresence(other.uid, (presence) => {
      setOtherIsOnline(presence.online);
      setOtherLastSeen(presence.lastSeenAt);
      setOtherHidesLastSeen(Boolean(presence.hideLastSeen));
    });
    return unsub;
  }, [other?.uid]);

  // Reciprocal last-seen visibility: if either you or the other person has turned
  // last-seen off, neither of you sees the other's exact last-seen time.
  const lastSeenHidden = otherHidesLastSeen || Boolean(myProfile?.hideLastSeen);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Tick the rate-limit cooldown countdown and auto-clear once it expires.
  useEffect(() => {
    if (!rateLimitedUntil) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
      if (Date.now() >= rateLimitedUntil) setRateLimitedUntil(null);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitedUntil]);

  // Load the chat-lock state on open so a locked user sees the banner straight away.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void getChatLockStatus().then((st) => {
      if (!cancelled && st?.locked) setChatLockedUntil(st.lockedUntil);
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Update typing status
    if (!user) return;
    
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      setTypingStatus(id, user.uid, true).catch(console.error);
    } else if (isTyping && !value.trim()) {
      setIsTyping(false);
      setTypingStatus(id, user.uid, false).catch(console.error);
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (user && isTyping) {
        setIsTyping(false);
        setTypingStatus(id, user.uid, false).catch(console.error);
      }
    }, 3000);
  };

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || !user) return;
    // Belt-and-braces: the composer UI is already hidden until verified (see the
    // render below), and firestore.rules rejects the write server-side regardless —
    // this just avoids a pointless round-trip if it's somehow called anyway.
    if (!isVerified(myProfile)) return;

    if (rateLimitedUntil && Date.now() < rateLimitedUntil) return;
    if (chatLocked) return;

    // Editing an existing message takes over the composer, so route the send there instead.
    if (editingId) {
      const targetId = editingId;
      setEditingId(null);
      setInput('');
      try {
        await editMessage(id, targetId, value);
      } catch (err) {
        if (err instanceof ChatLockedError) {
          setChatLockedUntil(err.lockedUntil);
          alert(err.message);
        } else if (err instanceof ContentPolicyError) {
          alert(err.message);
        } else {
          console.error(err);
        }
      }
      return;
    }

    setInput('');
    setShowEmojiPicker(false);
    const reply = replyingTo;
    setReplyingTo(null);
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      await setTypingStatus(id, user.uid, false);
    }
    
    playSend();
    setSendBounce(true);
    setTimeout(() => setSendBounce(false), 340);

    try {
      if (!other) throw new Error('Recipient not loaded');
      await sendMessage(id, user.uid, other.uid, value, reply ? { id: reply.id, text: reply.text, from: reply.from } : undefined);
      if (other && myProfile) {
        void notify({ toUid: other.uid, fromName: myProfile.name, type: 'message', matchId: id });
      }
    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimitedUntil(Date.now() + err.retryAfterMs);
        setInput(value);
        if (reply) setReplyingTo(reply);
      } else if (err instanceof ChatLockedError) {
        // 5th warning (or already locked): lock the composer and show why.
        setChatLockedUntil(err.lockedUntil);
        setInput('');
        alert(err.message);
      } else if (err instanceof ContentPolicyError) {
        // Includes the "Warning n of 5" text for flirty / romantic / sexual messages.
        setInput(value);
        alert(err.message);
      } else if (err instanceof BlockedError) {
        alert('This message couldn\u2019t be sent.');
      } else {
        console.error(err);
      }
    }
  };

  const startReply = (message: MessageDoc) => {
    setEditingId(null);
    setInput('');
    setReplyingTo(message);
    setActionsFor(null);
    inputRef.current?.focus();
  };

  const startEdit = (message: MessageDoc) => {
    setReplyingTo(null);
    setEditingId(message.id);
    setInput(message.text);
    setActionsFor(null);
    inputRef.current?.focus();
  };

  const cancelCompose = () => {
    setReplyingTo(null);
    setEditingId(null);
    setInput('');
  };

  const doUnsend = async (messageId: string) => {
    setUnsendConfirmFor(null);
    setActionsFor(null);
    if (editingId === messageId) cancelCompose();
    try {
      await unsendMessage(id, messageId);
    } catch (err) {
      console.error(err);
    }
  };



  // Inserts at the current cursor position (falling back to the end) rather than always
  // appending, so picking an emoji mid-sentence doesn't jump it to the end of the input.
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const doBlock = async () => {
    if (!user || !other) return;
    setBusy(true);
    try {
      await blockUser(user.uid, other.uid);
      await refreshProfile();
      setShowBlock(false);
      router.replace('/chats');
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const quickReportMessage = (message: MessageDoc) => {
    setActionsFor(null);
    setReportReason(null);
    setReportError('');
    const quoted = message.text.length > 200 ? `${message.text.slice(0, 200)}…` : message.text;
    setReportDetails(`Reported message: "${quoted}"`);
    setShowBlock(false);
    setShowReport(true);
  };

  const chooseReportReason = (reason: ReportReason) => {
    setReportReason(reason);
    setReportError('');
  };

  const submitReport = async () => {
    if (!user || !other || !reportReason) return;
    setBusy(true);
    setReportError('');
    try {
      await reportUser(user.uid, other.uid, reportReason, reportDetails.trim());
      setReportSent(true);
      setTimeout(() => {
        setShowReport(false);
        setShowBlock(false);
        setReportSent(false);
        setReportReason(null);
        setReportDetails('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setReportError('Could not submit your report. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleReact = async (message: MessageDoc, emoji: string) => {
    if (!user) return;
    setActionsFor(null);
    const wasReacted = message.reactions?.[user.uid] === emoji;
    if (!wasReacted) {
      spawnBurst(emoji);
      if (emoji === '❤️') playHeart(); else playTap();
    }
    try {
      await toggleReaction(id, message.id, user.uid, emoji, message.reactions);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleMute = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (isMuted) await unmuteMatch(user.uid, id);
      else await muteMatch(user.uid, id);
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  if (!user || !match || !other) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <p className="text-[var(--muted)]">Loading chat…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
        <button onClick={() => router.back()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--inputBg)] transition-transform active:scale-90">
          <ChevronLeft size={20} color="var(--text)" />
        </button>
        <button onClick={() => router.push(`/user/${other.uid}`)} className="flex flex-1 items-center gap-3 text-left min-w-0">
          <div className="relative shrink-0">
            <img src={other.images[0] || 'https://images.unsplash.com/vector-1742875355318-00d715aec3e8?q=80&w=200'} className="h-11 w-11 rounded-full object-cover ring-2 ring-[var(--card)]" alt="" />
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--card)] ${otherIsOnline ? 'animate-ring-pulse' : ''}`}
              style={{ background: otherIsOnline ? 'var(--success)' : 'var(--muted2)' }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-extrabold text-[var(--text)]">{other.name}{other.age ? `, ${other.age}` : ''}</span>
              {other.verified && <BadgeCheck size={15} className="shrink-0 text-blue-500" fill="currentColor" color="var(--card)" />}
            </div>
            <div className="flex items-center gap-1 truncate">
              {typingUsers.includes(other.uid) ? (
                <span className="text-xs font-semibold text-[var(--primary)]">typing…</span>
              ) : (
                <p className="truncate text-xs text-[var(--muted)]">
                  {[other.job, other.location].filter(Boolean).join(' • ') || (otherIsOnline ? 'Online • Active now' : formatLastSeen(otherLastSeen, lastSeenHidden))}
                </p>
              )}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-center gap-1">
      
          <button
            onClick={() => { if (!busy && window.confirm(`Block ${other.name}? They won't be able to see you.`)) void doBlock(); }}
            disabled={busy}
            aria-label={`Block ${other.name}`}
            className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-500 transition-transform active:scale-90 disabled:opacity-60"
          >
            <Ban size={10} /> Block
          </button>
        </div>
        <button onClick={() => setShowBlock(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--inputBg)] transition-transform active:scale-90"><MoreVertical size={16} color="var(--text)" /></button>
      </div>

      {other.verified && (
        <div className="flex justify-center border-b border-[var(--border)] bg-[var(--card)] pb-2.5">
          <button
            onClick={() => router.push(`/user/${other.uid}`)}
            className="flex items-center mt-3 gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95"
            style={{ background: 'linear-gradient(90deg, var(--grad-a), var(--grad-b))' }}
          >
            <ShieldCheck size={13} /> Verified Profile
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/settings/safety')}
        className="mx-3 mt-2 flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--inputBg)] px-3.5 py-2.5 text-left transition-transform active:scale-[0.98]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, var(--grad-a), var(--grad-b))' }}>
          <ShieldCheck size={14} color="#fff" className="animate-shield-glow" />
        </span>
        <span className="min-w-0 flex-1">
          <p className="text-xs font-extrabold" style={{ color: 'var(--primary)' }}>This chat is safe and private</p>
          <p className="truncate text-[11px] text-[var(--muted)]">Be kind, stay safe • Video call before meeting up</p>
        </span>
        <ChevronRight size={16} color="var(--muted2)" className="shrink-0" />
      </button>

      <div ref={scrollRef} className="relative flex-1 min-h-0 overflow-y-auto p-4">
        <div className="relative flex flex-col gap-2.5">
          {messages.length === 0 && (
            <div className="mt-6 flex flex-col items-center text-center">
              <p className="font-extrabold text-[var(--text)]">You and {other.name} have accepted each other&apos;s interest</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Say hello and introduce yourself. Please keep the conversation respectful.</p>
            </div>
          )}
          {messages.map((item, idx) => {
            const me = item.from === user.uid;
            const prevTimestamp = idx > 0 ? messages[idx - 1].createdAt : undefined;
            const { time, showDate } = formatMessageTime(item.createdAt, prevTimestamp);
            const reactionEntries = Object.entries(item.reactions || {});
            // Group by emoji so repeated reactions collapse into one pill with a count.
            const grouped = reactionEntries.reduce<Record<string, string[]>>((acc, [uid, emoji]) => {
              (acc[emoji] ??= []).push(uid);
              return acc;
            }, {});
            const myReaction = user ? item.reactions?.[user.uid] : undefined;
            const actionsOpen = actionsFor === item.id;
            const isDeleted = Boolean(item.deleted);
            return (
              <div key={item.id} className={`flex flex-col ${me ? 'items-end' : 'items-start'} w-full`}>
              
                {showDate && (
                  <div className="mb-2 text-center text-[11px] text-[var(--muted2)]">
                    {new Date(item.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                )}
                <div
                  onDoubleClick={() => !isDeleted && setActionsFor(actionsOpen ? null : item.id)}
                  className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-5 ${me ? 'animate-bubble-in' : 'animate-bubble-in-left'}`}
                  style={{
                    background: me ? 'var(--primary)' : 'var(--card)',
                    color: me ? '#fff' : 'var(--text)',
                    borderRadius: 18,
                    borderBottomRightRadius: me ? 4 : 18,
                    borderBottomLeftRadius: me ? 18 : 4,
                    border: me ? 'none' : '1px solid var(--border)',
                    cursor: isDeleted ? 'default' : 'pointer',
                    opacity: isDeleted ? 0.7 : 1,
                  }}
                  title={isDeleted ? undefined : 'Double-tap for reply, edit & more'}
                >
                  {item.replyTo && !isDeleted && (
                    <div
                      className="mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs"
                      style={{
                        borderColor: me ? 'rgba(255,255,255,0.6)' : 'var(--primary)',
                        background: me ? 'rgba(255,255,255,0.15)' : 'var(--inputBg)',
                        color: me ? 'rgba(255,255,255,0.9)' : 'var(--muted)',
                      }}
                    >
                      <p className="font-bold">{item.replyTo.from === user.uid ? 'You' : other.name}</p>
                      <p className="truncate">{item.replyTo.text}</p>
                    </div>
                  )}
                  {isDeleted ? (
                    <span className="italic" style={{ color: me ? 'rgba(255,255,255,0.85)' : 'var(--muted)' }}>
                      {me ? 'You unsent this message' : `${other.name} unsent this message`}
                    </span>
                  ) : (
                    item.text
                  )}
                </div>

                {actionsOpen && (
                  <div className="mt-1 flex flex-col items-start gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-sm">
                    <div className="flex items-center gap-1">
                      {MESSAGE_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(item, emoji)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-base"
                          style={{ background: myReaction === emoji ? 'var(--inputBg)' : 'transparent' }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="flex w-full flex-col">
                      <button
                        onClick={() => startReply(item)}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--text)]"
                      >
                        <Reply size={13} /> Reply
                      </button>
                      {!me && (
                        <button
                          onClick={() => quickReportMessage(item)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-amber-600"
                        >
                          <Flag size={13} /> Report
                        </button>
                      )}
                      {me && (
                        <>
                          <button
                            onClick={() => startEdit(item)}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--text)]"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => setUnsendConfirmFor(item.id)}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-red-500"
                          >
                            <Trash2 size={13} /> Unsend
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!isDeleted && Object.keys(grouped).length > 0 && (
                  <div className="mx-1 mt-1 flex flex-wrap items-center gap-1">
                    {Object.entries(grouped).map(([emoji, uids]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(item, emoji)}
                        className="flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]"
                        style={{
                          borderColor: uids.includes(user.uid) ? 'var(--primary)' : 'var(--border)',
                          background: uids.includes(user.uid) ? 'var(--inputBg)' : 'var(--card)',
                        }}
                      >
                        <span>{emoji}</span>
                        {uids.length > 1 && <span className="font-semibold text-[var(--muted)]">{uids.length}</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mx-1 mt-1 flex items-center gap-1">
                  <span className="text-[11px] text-[var(--muted2)]">
                    {time}
                  </span>
                  {!isDeleted && item.editedAt && (
                    <span className="text-[11px] text-[var(--muted2)]">(edited)</span>
                  )}
                  {me && (
                    item.read ? <CheckCheck size={12} color="#22c55e" />
                    : item.delivered ? <CheckCheck size={12} color="var(--muted2)" />
                    : <Check size={12} color="var(--muted2)" />
                  )}
                </div>

                {unsendConfirmFor === item.id && (
                  <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40" onClick={() => setUnsendConfirmFor(null)}>
                    <div className="flex w-full animate-slide-up flex-col gap-3 rounded-t-3xl bg-[var(--card)] p-5" onClick={(e) => e.stopPropagation()}>
                      <div className="mx-auto h-1 w-10 rounded-full bg-[var(--border)]" />
                      <p className="font-extrabold text-[var(--text)]">Unsend this message?</p>
                      <p className="text-xs text-[var(--muted)]">{other.name} will see that a message was unsent, but not what it said.</p>
                      <button onClick={() => doUnsend(item.id)} className="h-12 rounded-xl bg-red-500 font-bold text-white">
                        Unsend
                      </button>
                      <button onClick={() => setUnsendConfirmFor(null)} className="h-12 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] font-bold text-[var(--text)]">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {typingUsers.includes(other.uid) && (
            <div className="flex flex-col items-start w-full">
              <div
                className="px-3.5 py-2.5 text-sm leading-5"
                style={{
                  background: 'var(--card)',
                  color: 'var(--text)',
                  borderRadius: 18,
                  borderBottomLeftRadius: 4,
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--muted)]" style={{ animation: 'pulse 0.6s infinite' }} />
                  <span className="h-2 w-2 rounded-full bg-[var(--muted)]" style={{ animation: 'pulse 0.6s infinite 0.2s' }} />
                  <span className="h-2 w-2 rounded-full bg-[var(--muted)]" style={{ animation: 'pulse 0.6s infinite 0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {bursts.length > 0 && (
        <div className="pointer-events-none relative h-0">
          {bursts.map((b) => (
            <span key={b.id} className="animate-heart-float text-2xl" style={{ left: `${b.left}%`, bottom: 4 }}>
              {b.emoji}
            </span>
          ))}
        </div>
      )}

      {(replyingTo || editingId) && (
        <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--inputBg)] px-3 py-2">
          {editingId ? (
            <Pencil size={14} color="var(--primary)" />
          ) : (
            <Reply size={14} color="var(--primary)" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-[var(--primary)]">
              {editingId ? 'Editing message' : `Replying to ${replyingTo?.from === user.uid ? 'yourself' : other.name}`}
            </p>
            {replyingTo && <p className="truncate text-xs text-[var(--muted)]">{replyingTo.text}</p>}
          </div>
          <button onClick={cancelCompose} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--card)]">
            <X size={14} color="var(--text)" />
          </button>
        </div>
      )}

      {chatLocked && chatLockedUntil && (
        <div className="flex items-center gap-2 border-t border-[var(--border)] bg-red-50 px-3 py-2">
          <Ban size={14} color="#DC2626" className="shrink-0" />
          <p className="text-xs font-semibold leading-[16px] text-red-800">
            Chat locked until {new Date(chatLockedUntil).toLocaleString()} — you received 5 warnings for sexual or abusive messages. Please keep conversations respectful.
          </p>
        </div>
      )}

      {rateLimitedUntil && rateLimitedUntil > Date.now() && (
        <div className="flex items-center gap-2 border-t border-[var(--border)] bg-amber-50 px-3 py-2">
          <Flag size={14} color="#D97706" className="shrink-0" />
          <p className="text-xs font-semibold leading-[16px] text-amber-800">
            Sending too fast — new accounts are limited to {MAX_MESSAGES_PER_WINDOW} messages/min to prevent spam. Try again in {Math.max(1, Math.ceil((rateLimitedUntil - nowTick) / 1000))}s.
          </p>
        </div>
      )}

      {showEmojiPicker && (
        <>
          {/* Transparent backdrop just to catch outside clicks and close the picker —
              matches the pattern used for the block/report sheets below, minus the
              dimming, since this shouldn't obscure the conversation. */}
          <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
          <div className="relative z-50 border-t border-[var(--border)] bg-[var(--inputBg)] px-3 py-2.5">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_PICKER_SET.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg active:bg-[var(--card)]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {isVerified(myProfile) ? (
        <div className="border-t border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2 p-3">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--inputBg)] transition-transform active:scale-90"
              title="Insert emoji"
            >
              <Smile size={19} color={showEmojiPicker ? 'var(--primary)' : 'var(--muted)'} />
            </button>
            <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--inputBg)] px-3.5">
              <input
                ref={inputRef}
                placeholder={editingId ? 'Edit message…' : chatLocked ? 'Chat is locked…' : composerDisabled ? 'Slow down a little…' : 'Type a message…'}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                disabled={composerDisabled}
                className="flex-1 bg-transparent font-medium text-[var(--text)] outline-none placeholder:text-[var(--muted2)] disabled:opacity-60"
              />
            </div>
            <button
              onClick={() => send()}
              disabled={composerDisabled}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90 disabled:opacity-60 ${sendBounce ? 'animate-send-pop' : ''}`}
              style={{ background: input.trim() ? 'linear-gradient(135deg, var(--grad-a), var(--grad-b))' : 'var(--muted2)' }}
            >
              <Send size={18} color="#fff" />
            </button>
          </div>
        </div>
      ) : (
        // Searching and sending interests stay open to everyone, but actually connecting —
        // sending a message — is gated on the blue-check face verification. Messages already in
        // the thread (e.g. sent before this gate existed, or from the other person) still
        // show above; only replying is blocked.
        <button
          onClick={() => router.push('/settings/verification')}
          className="flex items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--card)] p-4 font-extrabold text-[var(--primary)]"
        >
          <ShieldCheck size={18} /> Verify your face to start chatting
        </button>
      )}

      {showBlock && !showReport && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40" onClick={() => setShowBlock(false)}>
          <div className="flex w-full animate-slide-up flex-col gap-3 rounded-t-3xl bg-[var(--card)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-[var(--border)]" />
            <button onClick={doBlock} disabled={busy} className="flex items-center gap-3 py-2.5 text-left disabled:opacity-60">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50"><Ban size={18} color="#EF4444" /></span>
              <span>
                <p className="font-bold text-[var(--text)]">Block {other.name}</p>
                <p className="text-xs text-[var(--muted)]">They won&apos;t be able to see you</p>
              </span>
            </button>
            <button onClick={() => setShowReport(true)} className="flex items-center gap-3 py-2.5 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50"><Flag size={18} color="#D97706" /></span>
              <span>
                <p className="font-bold text-[var(--text)]">Report profile</p>
                <p className="text-xs text-[var(--muted)]">Fake, spam or inappropriate</p>
              </span>
            </button>
            <button onClick={toggleMute} disabled={busy} className="flex items-center gap-3 py-2.5 text-left disabled:opacity-60">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]">
                {isMuted ? <Volume2 size={18} color="var(--text)" /> : <VolumeX size={18} color="var(--text)" />}
              </span>
              <span>
                <p className="font-bold text-[var(--text)]">{isMuted ? 'Unmute notifications' : 'Mute notifications'}</p>
                <p className="text-xs text-[var(--muted)]">{isMuted ? 'Resume alerts for this chat' : 'Stop alerts for this chat'}</p>
              </span>
            </button>
            <a href="/settings/safety" className="flex items-center gap-3 py-2.5 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50"><ShieldCheck size={18} color="#2563EB" /></span>
              <span>
                <p className="font-bold text-[var(--text)]">Safety Center</p>
                <p className="text-xs text-[var(--muted)]">Tips for meeting safely, helplines &amp; scam warnings</p>
              </span>
            </a>
            <a href="tel:112" className="flex items-center gap-3 py-2.5 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-base">📞</span>
              <span>
                <p className="font-bold text-red-600">Emergency — call 112</p>
                <p className="text-xs text-[var(--muted)]">If you feel unsafe, call first</p>
              </span>
            </a>
            <button onClick={() => setShowBlock(false)} className="mt-2 h-12 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] font-bold text-[var(--text)]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40" onClick={() => { if (!busy) { setShowReport(false); setReportReason(null); setReportError(''); } }}>
          <div className="flex w-full animate-slide-up flex-col gap-1 rounded-t-3xl bg-[var(--card)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--border)]" />
            {reportSent ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Check size={22} color="var(--success)" />
                <p className="font-bold text-[var(--text)]">Report submitted</p>
                <p className="text-xs text-[var(--muted)]">Thanks — our team will take a look.</p>
              </div>
            ) : reportReason ? (
              <>
                <p className="mb-1 font-extrabold text-[var(--text)]">Anything else we should know?</p>
                <p className="mb-2 text-xs text-[var(--muted)]">Optional — add details to help our team review faster.</p>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value.slice(0, 300))}
                  placeholder="Describe what happened…"
                  className="h-24 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--inputBg)] p-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted2)]"
                />
                {reportError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{reportError}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={submitReport} disabled={busy} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white disabled:opacity-60">
                    {busy ? 'Submitting…' : 'Submit report'}
                  </button>
                  <button onClick={() => setReportReason(null)} disabled={busy} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)] disabled:opacity-60">
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-1 font-extrabold text-[var(--text)]">Why are you reporting {other.name}?</p>
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => chooseReportReason(r.id)}
                    disabled={busy}
                    className="rounded-xl px-2 py-3 text-left font-semibold text-[var(--text)] disabled:opacity-60"
                  >
                    {r.label}
                  </button>
                ))}
                <button onClick={() => { setShowReport(false); setReportReason(null); setReportError(''); }} className="mt-2 h-12 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] font-bold text-[var(--text)]">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}