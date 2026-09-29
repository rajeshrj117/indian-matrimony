// Grants (or revokes) moderator access to /admin:
//   node scripts/set-admin.mjs <uid> [--revoke]
// The user must sign out and back in (or wait up to 1 hour) for the new claim to reach their token.
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [uid, flag] = process.argv.slice(2);
if (!uid) { console.error('Usage: node scripts/set-admin.mjs <uid> [--revoke]'); process.exit(1); }
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const user = await getAuth().getUser(uid);
await getAuth().setCustomUserClaims(uid, { ...(user.customClaims ?? {}), admin: flag !== '--revoke' });
console.log(`${flag === '--revoke' ? 'Revoked' : 'Granted'} admin for ${uid}.`);
