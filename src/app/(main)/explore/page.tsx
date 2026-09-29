import { redirect } from 'next/navigation';

// The old swipe-era "Explore" tab moved to /interests (Received, Sent, Accepted, Shortlist, Viewed you).
export default function ExploreRedirect() {
  redirect('/interests');
}
