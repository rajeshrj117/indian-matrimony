'use client';

import { useEffect, useState } from 'react';
import { BrainCircuit, Camera, Check, Crown, Lock, MessageCircle, Phone, Sparkles, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  activateSpotlight, getApprovedPrivatePhotos, listenContactRequests, requestContact,
  requestPrivatePhotos, sendPremiumMessage, type ContactRequestDoc,
} from '@/lib/firestore';
import { mutualCompatibility } from '@/lib/matrimony';
import { authedFetch } from '@/lib/api-client';
import type { Profile } from '@/lib/types';

export default function Phase3Actions({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { user, profile: me } = useAuth();
  const [requests, setRequests] = useState<ContactRequestDoc[]>([]);
  const [approvedPhotos, setApprovedPhotos] = useState<string[]>([]);
  const [premiumText, setPremiumText] = useState('');
  const [busy, setBusy] = useState('');
  const [spotlight, setSpotlight] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenContactRequests(user.uid, setRequests);
  }, [user]);

  useEffect(() => {
    if (!user || !profile?.uid || user.uid === profile.uid) return;
    getApprovedPrivatePhotos(user.uid, profile.uid).then(setApprovedPhotos).catch(() => setApprovedPhotos([]));
  }, [user, profile.uid]);

  const compatibility = mutualCompatibility(me, profile);
  useEffect(() => {
    if (!me || !compatibility.score) return;
    const factors = [...compatibility.theyFitYou, ...compatibility.youFitThem].filter(x => x.ok).slice(0, 8).map(x => x.label);
    const fallback = `The ${compatibility.score}% signal comes from the matrimonial preferences available on both profiles. ${factors.length ? `Matching factors include ${factors.join(', ')}.` : ''} Consider this alongside direct conversations and family expectations.`;
    setAiBusy(true);
    authedFetch('/api/groq/compatibility', { score: compatibility.score, factors, fallback }).then(r => r.json()).then(d => setAiExplanation(d.explanation || fallback)).catch(() => setAiExplanation(fallback)).finally(() => setAiBusy(false));
  }, [me, compatibility.score]);

  if (!user || !me || user.uid === profile.uid) return null;

  const premium = Boolean(me.premium);
  const contactFor = (type: 'phone' | 'whatsapp') => requests.find(r => r.requester === user.uid && r.target === profile.uid && r.type === type);

  const request = async (type: 'phone' | 'whatsapp') => {
    if (!premium) { router.push('/premium'); return; }
    setBusy(type);
    try { await requestContact(user.uid, profile.uid, type); } catch (e) { alert(e instanceof Error ? e.message : 'Could not send request.'); }
    finally { setBusy(''); }
  };

  const privatePhotos = async () => {
    setBusy('photos');
    try { await requestPrivatePhotos(user.uid, profile.uid); alert('Private photo request sent.'); }
    catch (e) { alert(e instanceof Error ? e.message : 'Could not send request.'); }
    finally { setBusy(''); }
  };

  const premiumMessage = async () => {
    if (!premium) { router.push('/premium'); return; }
    setBusy('message');
    try { await sendPremiumMessage(user.uid, profile.uid, premiumText); setPremiumText(''); alert('Premium message sent for approval.'); }
    catch (e) { alert(e instanceof Error ? e.message : 'Could not send message.'); }
    finally { setBusy(''); }
  };

  const doSpotlight = async () => {
    if (!premium) { router.push('/premium'); return; }
    setBusy('spotlight');
    try { await activateSpotlight(user.uid); setSpotlight(true); } catch (e) { alert(e instanceof Error ? e.message : 'Could not activate Spotlight.'); }
    finally { setBusy(''); }
  };

  const phoneApproved = contactFor('phone')?.status === 'approved' ? contactFor('phone') : null;
  const whatsappApproved = contactFor('whatsapp')?.status === 'approved' ? contactFor('whatsapp') : null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-extrabold text-[var(--text)]"><Crown size={16} color="var(--primary)" /> Phase 3 connections</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Extra contact, privacy and compatibility tools.</p>
        </div>
        {!premium && <button onClick={() => router.push('/premium')} className="rounded-full bg-[var(--primary)] px-3 py-1.5 text-[11px] font-extrabold text-white">Go Premium</button>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => request('phone')} className="rounded-xl border border-[var(--border)] p-3 text-left">
          <Phone size={16} color="var(--primary)" /><p className="mt-1 text-xs font-extrabold">Contact number</p>
          <p className="text-[10px] text-[var(--muted)]">Request with consent</p>
        </button>
        <button onClick={() => request('whatsapp')} className="rounded-xl border border-[var(--border)] p-3 text-left">
          <MessageCircle size={16} color="var(--primary)" /><p className="mt-1 text-xs font-extrabold">WhatsApp request</p>
          <p className="text-[10px] text-[var(--muted)]">Only shared after approval</p>
        </button>
        <button onClick={privatePhotos} className="rounded-xl border border-[var(--border)] p-3 text-left">
          <Camera size={16} color="var(--primary)" /><p className="mt-1 text-xs font-extrabold">Hidden photos</p>
          <p className="text-[10px] text-[var(--muted)]">Ask to unlock private gallery</p>
        </button>
        <button onClick={doSpotlight} className="rounded-xl border border-[var(--border)] p-3 text-left">
          <Star size={16} color="var(--primary)" /><p className="mt-1 text-xs font-extrabold">Spotlight</p>
          <p className="text-[10px] text-[var(--muted)]">{spotlight ? 'Active for 1 hour' : 'Boost your profile'}</p>
        </button>
      </div>

      {(phoneApproved?.sharedPhone || whatsappApproved?.sharedPhone) && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
          {phoneApproved?.sharedPhone && <p>Phone shared with you: {phoneApproved.sharedPhone}</p>}
          {whatsappApproved?.sharedPhone && <a className="mt-1 block underline" href={`https://wa.me/${whatsappApproved.sharedPhone.replace(/\D/g, '')}`}>Open WhatsApp</a>}
        </div>
      )}

      {approvedPhotos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {approvedPhotos.map((url, i) => <img key={url} src={url} alt={`Private photo ${i + 1}`} className="aspect-square rounded-xl object-cover" />)}
        </div>
      )}

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="flex items-center gap-1.5 text-sm font-extrabold"><BrainCircuit size={16} color="var(--primary)" /> AI compatibility explanation</p>
        {compatibility.score === null ? (
          <p className="mt-1 text-xs text-[var(--muted)]">Add partner preferences and horoscope details to generate an explanation.</p>
        ) : (
          <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[var(--muted)]">{aiBusy ? 'Generating explanation…' : (aiExplanation || `You have a ${compatibility.score}% compatibility signal. This is an explainable matching aid, not a prediction of relationship success.`)}</p>
        )}
        <button onClick={() => router.push(`/horoscope/${profile.uid}`)} className="mt-2 flex items-center gap-1.5 text-xs font-extrabold text-[var(--primary)]"><Sparkles size={13} /> View horoscope compatibility</button>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="flex items-center gap-1.5 text-sm font-extrabold"><MessageCircle size={16} color="var(--primary)" /> Premium Messaging</p>
        <div className="mt-2 flex gap-2">
          <input value={premiumText} onChange={e => setPremiumText(e.target.value.slice(0, 500))} placeholder="Introduce yourself…" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--inputBg)] px-3 py-2 text-xs outline-none" />
          <button disabled={busy === 'message'} onClick={premiumMessage} className="rounded-xl bg-[var(--primary)] px-3 text-xs font-extrabold text-white disabled:opacity-50">Send</button>
        </div>
        {!premium && <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)]"><Lock size={10} /> Premium members can send an intro before a match.</p>}
      </div>
    </section>
  );
}
