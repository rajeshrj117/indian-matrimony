import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { ApiError, fail, readJson, requireAdmin, str } from '@/lib/server/guard';
import { setModerationStatus } from '@/lib/server/moderation';

// Moderator API behind the /admin dashboard. Admin = Firebase custom claim `admin: true`
// (scripts/set-admin.mjs) or a uid listed in ADMIN_UIDS. Every action is written to
// moderationAudit.
//
// GET  -> { reports, queue, signals }   open work, newest/highest priority first
// POST -> { kind: 'report'|'queue', id, uid, action: dismiss|warn|restrict|suspend|ban|reinstate, note? }
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, normal: 2 };

export async function GET(req: NextRequest) {
  try {
    const { db } = await requireAdmin(req);
    const [reportsSnap, queueSnap, signalsSnap] = await Promise.all([
      db.collection('reports').where('status', 'in', ['open', 'triaged']).limit(200).get(),
      db.collection('moderationQueue').where('status', '==', 'open').limit(200).get(),
      db.collection('abuseSignals').where('createdAt', '>', Date.now() - 7 * 86_400_000).limit(500).get(),
    ]);
    const sort = (a: { priority?: string; createdAt: number }, b: { priority?: string; createdAt: number }) =>
      (PRIORITY_RANK[a.priority ?? 'normal'] - PRIORITY_RANK[b.priority ?? 'normal']) || b.createdAt - a.createdAt;

    const reports = reportsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; reportedUid: string; reporterUid: string; priority?: string; createdAt: number })).sort(sort);
    const queue = queueSnap.docs.map((d) => ({ id: d.id, ...d.data() } as { id: string; uid: string; priority?: string; createdAt: number })).sort(sort);

    const byUid = new Map<string, { uid: string; count: number; flags: Record<string, number> }>();
    for (const d of signalsSnap.docs) {
      const s = d.data();
      const e = byUid.get(s.uid) ?? { uid: s.uid as string, count: 0, flags: {} };
      e.count++;
      for (const f of (s.flags ?? []) as string[]) e.flags[f] = (e.flags[f] ?? 0) + 1;
      byUid.set(s.uid, e);
    }
    const signals = [...byUid.values()].filter((e) => e.count >= 3).sort((a, b) => b.count - a.count).slice(0, 50);

    // Attach light user summaries (name, photo, verified, moderation status) — never phone/email.
    const uids = [...new Set([...reports.map((r) => r.reportedUid), ...queue.map((q) => q.uid), ...signals.map((s) => s.uid)])];
    const users: Record<string, unknown> = {};
    await Promise.all(uids.map(async (uid) => {
      const [u, m] = await Promise.all([db.collection('users').doc(uid).get(), db.collection('moderation').doc(uid).get()]);
      users[uid] = { name: u.data()?.name ?? '(deleted)', photo: u.data()?.images?.[0] ?? null, verified: Boolean(u.data()?.verified), status: m.data()?.status ?? 'active' };
    }));
    return NextResponse.json({ reports, queue, signals, users });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const { db } = admin;
    const body = await readJson(req, 4_000);
    const kind = str(body.kind, 10);
    const id = str(body.id, 128);
    const uid = str(body.uid, 128);
    const action = str(body.action, 12);
    const note = str(body.note, 500);
    if (!['report', 'queue', 'user'].includes(kind) || !['dismiss', 'warn', 'restrict', 'suspend', 'ban', 'reinstate'].includes(action)) {
      throw new ApiError(400, 'Invalid action.');
    }
    if (action !== 'dismiss' && !uid) throw new ApiError(400, 'uid required.');
    const app = getAdminApp()!;

    if (action === 'warn') {
      await db.collection('moderation').doc(uid).set({ warnings: FieldValue.increment(1), lastWarningAt: Date.now(), status: 'active' }, { merge: true });
    } else if (action === 'restrict' || action === 'suspend' || action === 'ban') {
      const status = action === 'restrict' ? 'restricted' : action === 'suspend' ? 'suspended' : 'banned';
      await setModerationStatus(db, uid, status, note || `Moderator action: ${action}`, admin.uid);
      if (action === 'ban') {
        const rec = await getAuth(app).getUser(uid).catch(() => null);
        await getAuth(app).updateUser(uid, { disabled: true }).catch(() => {});
        await getAuth(app).revokeRefreshTokens(uid).catch(() => {});
        for (const ident of [rec?.phoneNumber, rec?.email]) {
          if (ident) await db.collection('blockedIdentities').doc(ident).set({ uid, at: Date.now() });
        }
      }
    } else if (action === 'reinstate') {
      await setModerationStatus(db, uid, 'active', note || 'Reinstated', admin.uid);
      await getAuth(app).updateUser(uid, { disabled: false }).catch(() => {});
      const rec = await getAuth(app).getUser(uid).catch(() => null);
      for (const ident of [rec?.phoneNumber, rec?.email]) if (ident) await db.collection('blockedIdentities').doc(ident).delete().catch(() => {});
    }

    const resolved = { status: action === 'dismiss' ? 'dismissed' : 'actioned', resolvedBy: admin.uid, resolvedAt: Date.now(), resolution: action, resolutionNote: note };
    if (kind === 'report' && id) await db.collection('reports').doc(id).set(resolved, { merge: true });
    if (kind === 'queue' && id) await db.collection('moderationQueue').doc(id).set(resolved, { merge: true });

    await db.collection('moderationAudit').add({ by: admin.uid, kind, id, uid, action, note, at: Date.now() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
