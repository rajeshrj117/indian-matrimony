'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw, BadgeCheck } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { useAuth } from '@/lib/auth-context';
import { authedFetch } from '@/lib/api-client';

// Moderator dashboard. Access is enforced by /api/admin/moderation (custom claim `admin: true`
// or ADMIN_UIDS) — this page just renders what that API returns and shows "Not authorized" otherwise.
type UserInfo = { name: string; photo: string | null; verified: boolean; status: string };
type Report = { id: string; reportedUid: string; reporterUid: string; reason: string; details: string; priority?: string; createdAt: number; autoRestricted?: boolean; distinctReporters?: number; status: string };
type QueueItem = { id: string; uid: string; type: string; priority?: string; detail?: string; createdAt: number };
type Signal = { uid: string; count: number; flags: Record<string, number> };
type Data = { reports: Report[]; queue: QueueItem[]; signals: Signal[]; users: Record<string, UserInfo> };
type Action = 'dismiss' | 'warn' | 'restrict' | 'suspend' | 'ban' | 'reinstate';

const PRIORITY_STYLE: Record<string, string> = {
  critical: 'bg-red-600 text-white', high: 'bg-amber-500 text-white', normal: 'bg-[var(--inputBg)] text-[var(--muted)]',
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<'reports' | 'queue' | 'signals'>('reports');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await authedFetch('/api/admin/moderation', undefined, { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(res.status === 403 ? 'Not authorized.' : json?.error ?? 'Could not load.'); return; }
      setData(json);
    } catch { setError('Could not load.'); }
  }, []);

  useEffect(() => { if (user) void load(); }, [user, load]);

  const act = async (kind: 'report' | 'queue' | 'user', id: string, uid: string, action: Action) => {
    const note = action === 'dismiss' || action === 'warn' ? '' : (window.prompt(`Reason / note for "${action}" (shown in audit log):`) ?? '');
    if (action !== 'dismiss' && action !== 'warn' && note === '') return;
    if ((action === 'ban' || action === 'suspend') && !window.confirm(`Really ${action} this account?`)) return;
    setBusy(id + action);
    try {
      const res = await authedFetch('/api/admin/moderation', { kind, id, uid, action, note });
      if (!res.ok) setError((await res.json().catch(() => ({})))?.error ?? 'Action failed.');
      await load();
    } finally { setBusy(null); }
  };

  const who = (uid: string) => {
    const u = data?.users[uid];
    return (
      <div className="flex items-center gap-2.5">
        {u?.photo ? <img src={u.photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-[var(--inputBg)]" />}
        <div>
          <p className="flex items-center gap-1 font-extrabold">{u?.name ?? uid.slice(0, 8)} {u?.verified && <BadgeCheck size={14} color="var(--primary)" />}</p>
          <p className="text-[11px] text-[var(--muted)]">status: <b>{u?.status ?? 'active'}</b> · {uid.slice(0, 10)}…</p>
        </div>
      </div>
    );
  };

  const buttons = (kind: 'report' | 'queue' | 'user', id: string, uid: string) => (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {(['dismiss', 'warn', 'restrict', 'suspend', 'ban', 'reinstate'] as Action[]).map((a) => (
        <button key={a} disabled={busy !== null} onClick={() => act(kind, id, uid, a)}
          className={`rounded-full px-3 py-1.5 text-xs font-extrabold disabled:opacity-50 ${a === 'ban' ? 'bg-red-600 text-white' : a === 'dismiss' || a === 'reinstate' ? 'bg-[var(--inputBg)] text-[var(--text)]' : 'bg-amber-100 text-amber-900'}`}>
          {a}
        </button>
      ))}
    </div>
  );

  if (loading) return null;
  if (error === 'Not authorized.') return <PageShell title="Moderation"><p className="font-bold">Not authorized.</p></PageShell>;

  return (
    <PageShell title="Moderation">
      <div className="mb-3 flex items-center gap-2">
        {(['reports', 'queue', 'signals'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3.5 py-1.5 text-sm font-extrabold ${tab === t ? 'bg-[var(--primary)] text-white' : 'bg-[var(--inputBg)] text-[var(--text)]'}`}>
            {t === 'reports' ? `Reports (${data?.reports.length ?? 0})` : t === 'queue' ? `Review queue (${data?.queue.length ?? 0})` : `Abuse signals (${data?.signals.length ?? 0})`}
          </button>
        ))}
        <button onClick={load} aria-label="Refresh" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--inputBg)]"><RefreshCw size={16} /></button>
      </div>
      {error && <p className="mb-3 text-sm font-bold text-red-600">{error}</p>}

      {tab === 'reports' && data?.reports.map((r) => (
        <div key={r.id} className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${PRIORITY_STYLE[r.priority ?? 'normal']}`}>{r.priority ?? 'normal'}</span>
            <span className="text-[11px] text-[var(--muted)]">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
          {who(r.reportedUid)}
          <p className="mt-2 text-[13px]"><b>{r.reason.replace('_', ' ')}</b>{r.distinctReporters ? ` · ${r.distinctReporters} reporter(s)` : ''}{r.autoRestricted ? ' · auto-restricted' : ''}</p>
          {r.details && <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[var(--inputBg)] p-2 text-[13px] text-[var(--muted)]">{r.details}</p>}
          {buttons('report', r.id, r.reportedUid)}
        </div>
      ))}

      {tab === 'queue' && data?.queue.map((q) => (
        <div key={q.id} className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${PRIORITY_STYLE[q.priority ?? 'normal']}`}>{q.priority ?? 'normal'}</span>
            <span className="text-[11px] text-[var(--muted)]">{q.type.replace(/_/g, ' ')} · {new Date(q.createdAt).toLocaleString()}</span>
          </div>
          {who(q.uid)}
          {q.detail && <p className="mt-2 text-[13px] text-[var(--muted)]">{q.detail}</p>}
          {buttons('queue', q.id, q.uid)}
        </div>
      ))}

      {tab === 'signals' && data?.signals.map((s) => (
        <div key={s.uid} className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          {who(s.uid)}
          <p className="mt-2 text-[13px]"><b>{s.count}</b> flagged messages/bios in 7 days: {Object.entries(s.flags).map(([f, n]) => `${f} ×${n}`).join(', ')}</p>
          {buttons('user', '', s.uid)}
        </div>
      ))}

      {data && ((tab === 'reports' && !data.reports.length) || (tab === 'queue' && !data.queue.length) || (tab === 'signals' && !data.signals.length)) && (
        <div className="flex flex-col items-center gap-2 py-10 text-[var(--muted)]"><ShieldAlert size={28} /><p className="font-bold">Nothing to review 🎉</p></div>
      )}
    </PageShell>
  );
}
