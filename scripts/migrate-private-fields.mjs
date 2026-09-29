// One-off migration: moves sensitive fields off the world-readable users/{uid} docs into
// userPrivate/{uid} and adds the fuzzed public location.
//
//   FIREBASE_ADMIN_PROJECT_ID=... FIREBASE_ADMIN_CLIENT_EMAIL=... FIREBASE_ADMIN_PRIVATE_KEY="..." \
//     node scripts/migrate-private-fields.mjs [--dry-run]
//
// Run it BEFORE (or right after) deploying the new firestore.rules. It is idempotent. (The app also
// migrates each user's own doc automatically the next time they sign in, but this closes the
// exposure for everyone immediately — including users who never come back.)
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PUBLIC = new Set([
  'uid', 'name', 'age', 'gender', 'interestedIn', 'relationship', 'bio', 'expectations', 'work', 'drinking',
  'smoking', 'location', 'approxLatitude', 'approxLongitude', 'job', 'interests', 'images', 'verified',
  'verificationStatus', 'online', 'lastSeenAt', 'hideLastSeen', 'onlyVerifiedCanMessage', 'profileComplete',
  'createdAt', 'updatedAt', 'moderated',
]);
const dry = process.argv.includes('--dry-run');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore();
const approx = (n) => Math.round(n * 10) / 10;

let moved = 0, scanned = 0;
let last = null;
for (;;) {
  let q = db.collection('users').orderBy('__name__').limit(300);
  if (last) q = q.startAfter(last);
  const snap = await q.get();
  if (snap.empty) break;
  const batch = db.batch();
  for (const d of snap.docs) {
    scanned++;
    const data = d.data();
    const stray = Object.keys(data).filter((k) => !PUBLIC.has(k));
    if (!stray.length) continue;
    const priv = {};
    for (const k of stray) if (k !== 'msgWindowStart' && k !== 'msgWindowCount') priv[k] = data[k];
    const patch = {};
    for (const k of stray) patch[k] = FieldValue.delete();
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      patch.approxLatitude = approx(data.latitude);
      patch.approxLongitude = approx(data.longitude);
    }
    if (Object.keys(priv).length) batch.set(db.collection('userPrivate').doc(d.id), priv, { merge: true });
    batch.update(d.ref, patch);
    moved++;
  }
  if (!dry) await batch.commit();
  last = snap.docs[snap.docs.length - 1];
}
console.log(`${dry ? '[dry run] would migrate' : 'Migrated'} ${moved} of ${scanned} user docs.`);
