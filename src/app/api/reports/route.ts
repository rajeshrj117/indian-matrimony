import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, fail, rateLimit, readJson, requireUser, str } from '@/lib/server/guard';
import { setModerationStatus } from '@/lib/server/moderation';

// Report intake + escalation workflow.
//   status:   open -> triaged -> actioned | dismissed   (moderators, see /admin)
//   priority: critical (underage) / high (harassment, inappropriate, or 3+ distinct
//             reporters in 30 days) / normal (spam, fake profile, other)
// Automatic protective actions (a human still makes the final call):
//   - the reporter immediately blocks the reported user (server-side, so it can't be skipped)
//   - "underage" reports, and 3+ distinct reporters, auto-RESTRICT the reported account
//     (can't message/like, hidden from discovery) until a moderator reviews it
// Clients can no longer write /reports directly (firestore.rules), so reports can't be
// spoofed, duplicated in bulk, or used to harass by flooding.
const REASONS = ['fake_profile', 'inappropriate', 'harassment', 'spam', 'underage', 'other'] as const;
const BASE_PRIORITY: Record<(typeof REASONS)[number], 'critical' | 'high' | 'normal'> = {
  underage: 'critical', harassment: 'high', inappropriate: 'high', fake_profile: 'normal', spam: 'normal', other: 'normal',
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req, 4_000);
    const reportedUid = str(body.reportedUid, 128);
    const reason = str(body.reason, 32) as (typeof REASONS)[number];
    const details = str(body.details, 1000);
    if (!reportedUid || reportedUid === user.uid) throw new ApiError(400, 'Invalid report.');
    if (!REASONS.includes(reason)) throw new ApiError(400, 'Invalid reason.');

    await rateLimit(user.db, { bucket: 'report:day', subject: user.uid, limit: 15, windowMs: 86_400_000 });

    const target = await user.db.collection('users').doc(reportedUid).get();
    if (!target.exists) throw new ApiError(404, 'User not found.');

    // De-duplicate: one open report per reporter/target pair.
    const existing = await user.db.collection('reports')
      .where('reporterUid', '==', user.uid).where('reportedUid', '==', reportedUid).limit(10).get();
    if (existing.docs.some((d) => ['open', 'triaged'].includes(d.data().status))) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Distinct reporters against this user in the last 30 days (including this one).
    const since = Date.now() - 30 * 86_400_000;
    const recent = await user.db.collection('reports').where('reportedUid', '==', reportedUid).limit(100).get();
    const reporters = new Set(recent.docs.filter((d) => d.data().createdAt >= since).map((d) => d.data().reporterUid as string));
    reporters.add(user.uid);

    let priority = BASE_PRIORITY[reason];
    const massReported = reporters.size >= 3;
    if (massReported && priority === 'normal') priority = 'high';
    const autoRestrict = reason === 'underage' || massReported;

    const ref = await user.db.collection('reports').add({
      reporterUid: user.uid, reportedUid, reason, details, createdAt: Date.now(),
      status: 'open', priority, autoRestricted: autoRestrict, distinctReporters: reporters.size,
    });

    await user.db.collection('userPrivate').doc(user.uid).set({ blockedUsers: FieldValue.arrayUnion(reportedUid) }, { merge: true });

    if (autoRestrict) {
      const cur = await user.db.collection('moderation').doc(reportedUid).get();
      if (!cur.exists || cur.data()?.status === 'active') {
        await setModerationStatus(user.db, reportedUid, 'restricted', `Auto-restricted: ${reason}, ${reporters.size} reporter(s)`, 'system');
      }
    }
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    return fail(err);
  }
}
