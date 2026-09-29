# Real-Time Features Documentation

This document describes the new real-time messaging features added to the Flirty application.

## New Features Added

### 1. **Real-Time Notifications** ✅
- **What it does**: Users receive instant notifications when someone likes them, sends a message, or matches with them
- **How it works**: 
  - A new `notifications` collection tracks all activity
  - Real-time listeners push updates to the client
  - Notifications have a read/unread status
- **User Impact**: 
  - Users see activity notifications in real-time
  - Can mark notifications as read individually or all at once
  - Notifications are stored persistently for later viewing

### 2. **Typing Indicators** ✅
- **What it does**: Users see when someone is typing a message in real-time
- **How it works**:
  - A `typing` subcollection under each match tracks who is actively typing
  - When a user starts typing, their status is set to `isTyping: true`
  - Automatically resets after 3 seconds of inactivity
  - Displayed as animated dots in the chat header
- **User Impact**:
  - "typing..." indicator appears in the chat header
  - Shows who is currently composing a message
  - Makes conversations feel more real-time and engaging

### 3. **Read Receipts** ✅
- **What it does**: Users see when their messages have been read by the recipient
- **How it works**:
  - Each message includes a `read: boolean` and `readAt: number` timestamp
  - Messages are automatically marked as read when they appear on screen
  - Read status is synced in real-time across all devices
  - Double check mark turns green when message is read
- **User Impact**:
  - Gray check mark = message delivered
  - Green check mark = message read
  - `readAt` timestamp indicates when the message was read

### 4. **Online Presence Sync** ✅
- **What it does**: Users can see if their match is currently online or offline
- **How it works**:
  - User's online status is synced when they open/close tabs or browser
  - `lastSeenAt` timestamp tracks when they were last active
  - Uses BroadcastChannel API to sync presence across browser tabs
  - Automatically sets offline when user closes/leaves page
- **User Impact**:
  - Green dot appears next to name when user is online
  - "Active now" or "Active X time ago" indicator in chat header
  - Matches list shows online status with border highlight
  - Accurate presence even with multiple tabs/devices

### 5. **Delivery Receipts** ✅
- **What it does**: Distinguishes "sent to server" from "delivered to recipient's device" from "read"
- **How it works**:
  - Each message now has `delivered: boolean` and `deliveredAt?: number`, alongside the existing `read`/`readAt`
  - A collection-group listener (`listenUndeliveredMessagesForUser`) watches every match a user is in and marks messages `delivered: true` the instant that device sees them in realtime — this runs app-wide (mounted once in `AppRealtime`), not just while a specific chat is open
  - Marking a message as read also implies delivered, so the ticks never go "backwards"
- **User Impact**:
  - Single gray check = sent (written to Firestore, recipient hasn't received it yet — e.g. they're offline)
  - Double gray check = delivered (recipient's device has it, but they haven't opened the chat)
  - Double green check = read

### 6. **Push Notifications (FCM)** ✅
- **What it does**: Sends real OS-level push notifications for likes, matches, and messages — even when the tab/app is closed
- **How it works**:
  - `src/lib/push.ts` requests browser notification permission, registers a service worker, and saves an FCM token to the user's profile (`fcmTokens: string[]`)
  - `/firebase-messaging-sw.js` is served by a route handler (`src/app/firebase-messaging-sw.js/route.ts`) so the Firebase config can be injected from env vars without a build step; it shows a system notification for background pushes and opens the right screen on click
  - `POST /api/push/send` (server-side, using `firebase-admin`) looks up a user's tokens and sends via FCM, pruning any tokens that have gone stale
  - `src/lib/notify.ts` ties it together: writes an `ActivityNotification` doc (for the in-app bell) and calls `/api/push/send`, from the actual trigger points — swiping a like/superlike, matching, and sending a chat message
  - While the tab is focused, pushes instead surface as an in-app toast (`AppRealtime.tsx`), since FCM doesn't auto-show a system notification in the foreground
- **User Impact**:
  - Tap "Enable notifications" in Settings → Notifications to opt in
  - Get notified of likes, matches, and messages from the lock screen / notification tray, not just while Flirty is open
  - A `/notifications` page (linked from the bell icon on Discover) lists notification history and marks things read on tap



### New Type Definitions (types.ts)

```typescript
type MessageDoc = {
  id: string;
  text: string;
  from: string;
  createdAt: number;
  read: boolean;        // NEW
  readAt?: number;      // NEW
};

type TypingIndicator = {
  matchId: string;
  userId: string;
  isTyping: boolean;
  updatedAt: number;
};

type ActivityNotification = {
  id?: string;
  userId: string;
  type: 'like' | 'match' | 'message' | 'superlike';
  fromUser: string;
  matchId?: string;
  read: boolean;
  createdAt: number;
};
```

### New Firestore Functions (firestore.ts)

**Read Receipts:**
- `markMessagesAsRead(matchId, userId)` - Mark unread messages as read
- `listenReadStatus(matchId, callback)` - Listen to read status changes

**Typing Indicators:**
- `setTypingStatus(matchId, userId, isTyping)` - Set or clear typing status
- `listenTypingStatus(matchId, callback)` - Listen to typing status

**Online Presence:**
- `updateOnlineStatus(uid, online)` - Update user's online status
- `listenUserOnlineStatus(uid, callback)` - Listen to online status changes
- `listenUserLastSeen(uid, callback)` - Listen to last seen time

**Activity Notifications:**
- `createActivityNotification(notification)` - Create a new notification
- `listenActivityNotifications(uid, callback)` - Listen to notifications
- `markNotificationAsRead(notificationId)` - Mark single notification as read
- `markAllNotificationsAsRead(uid)` - Mark all notifications as read

### New Hook (useRealTimeFeatures.ts)

```typescript
useOnlinePresence(uid) - Manages user's online status automatically
useTypingTimeout(isTyping, onTypingChange, delayMs) - Auto-clears typing status
```

### Updated Firestore Rules (firestore.rules)

- Messages can now be updated (for read receipts)
- Typing subcollections allow match participants to read/write
- New notifications collection with user-specific access
- Profile updates allowed for online status changes

## Usage Examples

### In Chat Component

```typescript
// Set typing status when user types
const handleInputChange = (e) => {
  if (!isTyping && value.trim()) {
    setTypingStatus(matchId, userId, true);
  }
};

// Listen to other user's typing
useEffect(() => {
  const unsub = listenTypingStatus(matchId, setTypingUsers);
  return unsub;
}, [matchId]);

// Mark messages as read
useEffect(() => {
  markMessagesAsRead(matchId, userId);
}, [messages]);

// Listen to online status
useEffect(() => {
  const unsub = listenUserOnlineStatus(otherUid, setOtherIsOnline);
  return unsub;
}, [otherUid]);
```

### In App Layout

```typescript
// Automatically sync online presence
useOnlinePresence(user?.uid);
```

## Firestore Data Structure

```
/matches/{matchId}
  /messages/{messageId}
    - text: string
    - from: string
    - createdAt: number
    - read: boolean (NEW)
    - readAt: number (NEW)
  
  /typing/{userId}
    - userId: string
    - isTyping: boolean
    - updatedAt: number

/notifications/{notificationId}
  - userId: string
  - type: string
  - fromUser: string
  - matchId: string
  - read: boolean
  - createdAt: number

/users/{uid}
  - online: boolean (NEW)
  - lastSeenAt: number (NEW)
```

## Performance Considerations

1. **Typing Indicators**: Automatically clear after 3 seconds to save database writes
2. **Read Receipts**: Batched updates only for unread messages
3. **Online Status**: Uses BroadcastChannel for cross-tab sync, minimizes Firestore writes
4. **Notifications**: Limited to 50 most recent per user with pagination support

## Browser Compatibility

- **BroadcastChannel API**: Used for cross-tab presence sync
  - Chrome/Edge/Safari 77+
  - Firefox 38+
  - Gracefully degrades in unsupported browsers

## Future Enhancements

- [x] Delivery receipts (message sent to server, then delivered to device)
- [x] Push notifications (PWA/FCM)
- [ ] Voice/video call notifications
- [ ] "Last seen" hiding (privacy setting)
- [ ] Bulk notification management
- [ ] Notification history/search
- [ ] Custom notification sounds
- [ ] Message reactions/emoji reactions
- [ ] Presence in discover/explore pages

## Testing Real-Time Features

1. **Typing Indicators**: Open chat in two windows, type in one and see indicator in the other
2. **Read Receipts**: Send message, open chat in another window to see read status change
3. **Online Presence**: Open app in one window, close it and watch status change in another
4. **Notifications**: Create a like/match and check notification in real-time

## Troubleshooting

**Typing indicator not clearing:**
- Check browser console for errors
- Ensure 3-second timeout is being triggered
- Verify typing document is being deleted from Firestore

**Read receipts not syncing:**
- Check if `read` field exists on message
- Verify Firestore rules allow message updates
- Check browser DevTools Network tab for failed requests

**Online status not updating:**
- Ensure `useOnlinePresence` hook is called in app layout
- Check if user's profile doc exists in Firestore
- Verify beforeunload event is firing (test by opening DevTools)

## Security Notes

- All real-time listeners enforce ownership checks
- Typing status only visible to match participants
- Notifications only accessible to recipient
- Online status publicly visible (can be made private with settings)
- Message read receipts only affect the sender's view
