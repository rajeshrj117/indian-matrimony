# Installation Guide - Real-Time Features

## Quick Start

The real-time features have been integrated into the main codebase. Here's what you need to do:

### 1. **Update Firestore Rules**

Replace your current `firestore.rules` with the updated version that includes:
- Typing indicators support
- Read receipts support  
- Activity notifications support
- Online presence support

**Steps:**
1. Go to Firebase Console > Firestore Database > Rules
2. Copy the contents of `firestore.rules` from this project
3. Click "Publish" to deploy

### 2. **Update Your Code** (if upgrading existing project)

The following files have been updated. Replace them in your project:

**Core Files:**
- `src/lib/types.ts` - Updated type definitions
- `src/lib/firestore.ts` - New real-time functions added
- `src/lib/useRealTimeFeatures.ts` - New hook for online presence
- `src/app/chat/[id]/page.tsx` - Updated chat UI and logic
- `src/app/globals.css` - Added animations

**No changes needed to:**
- `src/app/(main)/chats/page.tsx` - Already supports online status
- `src/lib/auth-context.tsx` - No changes
- Other components - Work as-is

### 3. **Add Online Presence Hook to App Layout**

In your main app layout (`src/app/layout.tsx`), add the online presence tracking:

```typescript
import { useOnlinePresence } from '@/lib/useRealTimeFeatures';
import { useAuth } from '@/lib/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Track user's online presence
  useOnlinePresence(user?.uid);
  
  return (
    <html>
      {/* ... rest of layout ... */}
    </html>
  );
}
```

### 4. **Verify Implementation**

Check these features are working:

**Real-Time Notifications:**
- [ ] Create a like/superlike and see if notification system responds
- [ ] Open notification listener and verify real-time updates

**Typing Indicators:**
- [ ] Open chat in two browsers
- [ ] Type in one browser and see "typing..." in the other
- [ ] Stop typing for 3 seconds and indicator disappears

**Read Receipts:**
- [ ] Send a message
- [ ] View it in another browser
- [ ] Check mark changes from gray to green in real-time

**Online Presence:**
- [ ] Open app in one tab
- [ ] Open app in another tab
- [ ] Close first tab and see online status change in second tab
- [ ] Matches list should show green dot and "Active now"

### 5. **Environment Setup** (No new env vars needed)

The real-time features use existing Firebase configuration. No new environment variables required.

## File Structure

```
src/
├── lib/
│   ├── firestore.ts (UPDATED - new functions added)
│   ├── types.ts (UPDATED - new types added)
│   └── useRealTimeFeatures.ts (NEW)
├── app/
│   ├── chat/[id]/
│   │   └── page.tsx (UPDATED - real-time UI)
│   ├── globals.css (UPDATED - new animations)
│   └── layout.tsx (ADD useOnlinePresence hook)
└── components/
    └── BottomNav.tsx (No changes)

firestore.rules (UPDATED - new rules)
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Real-time Listeners | ✅ | ✅ | ✅ | ✅ |
| Typing Indicators | ✅ | ✅ | ✅ | ✅ |
| Read Receipts | ✅ | ✅ | ✅ | ✅ |
| Online Presence | ✅ | ✅ | ✅ | ✅ |
| BroadcastChannel | ✅ 77+ | ✅ 38+ | ✅ 15.1+ | ✅ 79+ |

*Note: Online presence works without BroadcastChannel; cross-tab sync requires BroadcastChannel API*

## Troubleshooting

### "typing" subcollection is not being created

**Problem:** Typing indicators don't work
**Solution:** 
- Check if Firestore rules are updated
- Verify `setTypingStatus` function is being called
- Check browser console for errors

### Read receipts not showing as green

**Problem:** Check marks stay gray even when read
**Solution:**
- Ensure message update rule is deployed: `allow update: if signedIn()`
- Check if `markMessagesAsRead` is being called
- Verify `read` field exists on message documents

### Online status not updating

**Problem:** Green dot doesn't appear or disappears immediately
**Solution:**
- Ensure `useOnlinePresence` hook is in app layout
- Check if `online` field exists on user profile
- Verify `beforeunload` event listener is working (check DevTools > Application > Beforeunload)

### High Firestore usage

**Problem:** Billing shows unexpected Firestore writes
**Solution:**
- Typing status auto-clears after 3 seconds (good)
- Read receipts only update once per message (good)
- Consider adding presence update throttling
- Monitor notification creation - add spam prevention if needed

## Advanced Configuration

### Customize Typing Timeout

In `src/app/chat/[id]/page.tsx`, find:
```typescript
typingTimeoutRef.current = setTimeout(() => {
  if (user && isTyping) {
    setIsTyping(false);
    setTypingStatus(id, user.uid, false).catch(console.error);
  }
}, 3000); // Change 3000 to desired milliseconds
```

### Add Presence to Other Pages

You can add real-time listeners to discover/explore pages:

```typescript
import { listenUserOnlineStatus } from '@/lib/firestore';

// In your component:
useEffect(() => {
  const unsub = listenUserOnlineStatus(userUid, (isOnline) => {
    setOnlineStatus(isOnline);
  });
  return unsub;
}, [userUid]);
```

### Disable Features

To disable a feature temporarily:

**Disable Typing Indicators:**
```typescript
// In chat component, comment out:
// await setTypingStatus(id, user.uid, isTyping);
```

**Disable Read Receipts:**
```typescript
// In chat component, comment out:
// await markMessagesAsRead(id, user?.uid);
```

**Disable Online Status:**
```typescript
// In app layout, remove:
// useOnlinePresence(user?.uid);
```

## Performance Tips

1. **Limit Notification Listeners**: Only listen to notifications on profile/notification screens
2. **Batch Updates**: Mark multiple messages as read in one operation (already done)
3. **Throttle Presence**: Only update online status on tab switch (currently done)
4. **Clean Up Listeners**: Always return unsubscribe functions from useEffect
5. **Lazy Load Notifications**: Load older notifications on scroll (future feature)

## Data Privacy

- **Online Status**: Visible to everyone (consider adding privacy setting)
- **Read Receipts**: Only sender sees read status
- **Typing Indicators**: Only visible to match participants
- **Notifications**: Private to recipient only
- **Last Seen**: Visible to everyone (consider adding privacy setting)

## Support

For issues or questions:
1. Check `REALTIME_FEATURES.md` for detailed documentation
2. Review `CHANGELOG_REALTIME.md` for recent changes
3. Check browser console for error messages
4. Test in incognito mode to rule out cache issues
5. Clear Firestore cache in browser DevTools > Application > Storage

## Next Steps

After installation, consider:
- Adding notification badge counts
- Creating notification center UI
- Adding sound/vibration for notifications
- Implementing presence on discover/explore pages
- Adding typing indicator animation effects
- Creating presence status dropdown menu
