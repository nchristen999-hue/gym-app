const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

// URL des Power-Automate-Flows (HTTP-Trigger). In functions/.env setzen:
//   POWERAUTOMATE_URL=https://prod-xx.westeurope.logic.azure.com/...
const POWER_AUTOMATE_URL = process.env.POWERAUTOMATE_URL || '';

async function sendViaPowerAutomate(payload) {
  if (!POWER_AUTOMATE_URL) {
    console.error('powerautomate.url nicht konfiguriert – Mail wurde NICHT versendet.', payload);
    return;
  }
  const res = await fetch(POWER_AUTOMATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    console.error('Power Automate Call fehlgeschlagen:', res.status, await res.text().catch(() => ''));
  }
}

// Läuft automatisch bei jedem neuen Firebase-Auth-User.
// Google-Logins sind bereits von Google verifiziert -> keine Verify-Mail nötig.
exports.sendVerificationEmail = functions.auth.user().onCreate(async (user) => {
  const isPasswordUser = user.providerData.some((p) => p.providerId === 'password');
  if (!isPasswordUser || user.emailVerified) return;

  const link = await admin.auth().generateEmailVerificationLink(user.email, {
    url: 'https://gymapp-bb929.firebaseapp.com/' // Ziel-URL nach Klick auf den Link, bei Bedarf anpassen
  });

  await sendViaPowerAutomate({
    type: 'verify',
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    link
  });
});

// Wird vom Client aufgerufen ("Verify-Mail erneut senden"-Button).
exports.resendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
  }
  const user = await admin.auth().getUser(context.auth.uid);
  if (user.emailVerified) return { ok: true };

  const link = await admin.auth().generateEmailVerificationLink(user.email, {
    url: 'https://gymapp-bb929.firebaseapp.com/'
  });

  await sendViaPowerAutomate({
    type: 'verify',
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    link
  });
  return { ok: true };
});

// Wird vom Client aufgerufen (statt firebaseAuth.sendPasswordResetEmail).
exports.requestPasswordReset = functions.https.onCall(async (data) => {
  const email = String(data.email || '').trim().toLowerCase();
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email fehlt');
  }

  try {
    const [link, userRecord] = await Promise.all([
      admin.auth().generatePasswordResetLink(email),
      admin.auth().getUserByEmail(email).catch(() => null)
    ]);
    const displayName = (userRecord && userRecord.displayName) || email.split('@')[0];
    await sendViaPowerAutomate({ type: 'reset', email, displayName, link });
  } catch (e) {
    // Absichtlich nicht nach außen geben ob die Email existiert (User-Enumeration vermeiden).
    console.warn('requestPasswordReset:', e.message);
  }
  return { ok: true };
});
