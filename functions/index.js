const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { verifyEmailHtml, resetEmailHtml } = require('./emailTemplates');
admin.initializeApp();

// In functions/.env setzen:
//   BREVO_API_KEY=xkeysib-xxxxx
//   BREVO_FROM_EMAIL=gymtrack.noreply@gmail.com
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'gymtrack.noreply@gmail.com';

async function sendMail({ to, subject, html }) {
  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY nicht konfiguriert – Mail wurde NICHT versendet.', { to, subject });
    return;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { email: BREVO_FROM_EMAIL, name: 'GYMTRACK' },
      to: [{ email: to }],
      subject,
      htmlContent: html
    })
  });
  if (!res.ok) {
    console.error('Brevo Call fehlgeschlagen:', res.status, await res.text().catch(() => ''));
  }
}

// Läuft automatisch bei jedem neuen Firebase-Auth-User.
// Google-/Apple-Logins sind bereits verifiziert -> keine Verify-Mail nötig.
exports.sendVerificationEmail = functions.auth.user().onCreate(async (user) => {
  const isPasswordUser = user.providerData.some((p) => p.providerId === 'password');
  if (!isPasswordUser || user.emailVerified) return;

  const link = await admin.auth().generateEmailVerificationLink(user.email, {
    url: 'https://gymapp-bb929.firebaseapp.com/'
  });
  const displayName = user.displayName || user.email.split('@')[0];

  await sendMail({
    to: user.email,
    subject: 'Bestätige deine E-Mail – GYMTRACK',
    html: verifyEmailHtml({ displayName, email: user.email, link })
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
  const displayName = user.displayName || user.email.split('@')[0];

  await sendMail({
    to: user.email,
    subject: 'Bestätige deine E-Mail – GYMTRACK',
    html: verifyEmailHtml({ displayName, email: user.email, link })
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
    await sendMail({
      to: email,
      subject: 'Passwort zurücksetzen – GYMTRACK',
      html: resetEmailHtml({ displayName, email, link })
    });
  } catch (e) {
    // Absichtlich nicht nach außen geben ob die Email existiert (User-Enumeration vermeiden).
    console.warn('requestPasswordReset:', e.message);
  }
  return { ok: true };
});
