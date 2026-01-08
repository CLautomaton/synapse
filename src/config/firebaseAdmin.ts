import * as admin from 'firebase-admin';


export const firebaseAdminConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

// Build service account object from available env vars.
let serviceAccount: any = undefined;
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
function sanitizeRawKey(input: string) {
  if (!input) return input;
  // remove surrounding quotes and trailing commas, then trim
  let s = input.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  if (s.endsWith(',')) s = s.slice(0, -1).trim();
  return s;
}

if (raw) {
  const t = sanitizeRawKey(raw);
  // If the env value looks like JSON, parse it
  if (t.startsWith('{')) {
    try {
      serviceAccount = JSON.parse(t);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY contains invalid JSON');
    }
  } else if (t.includes('-----BEGIN') && t.includes('PRIVATE KEY-----')) {
    // Extract PEM block if there is surrounding text
    const begin = t.indexOf('-----BEGIN');
    const end = t.indexOf('-----END PRIVATE KEY-----');
    const pem = end !== -1 ? t.slice(begin, end + '-----END PRIVATE KEY-----'.length) : t;
    // construct a minimal service account
    serviceAccount = {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: pem.replace(/\\n/gm, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };
  } else {
    // try parse as JSON as a last resort
    try {
      serviceAccount = JSON.parse(t);
    } catch (e) {
      // leave undefined and fall back to individual env vars below
    }
  }
}

if (!serviceAccount) {
  // Fallback: assemble from individual env vars (private key may include literal \n sequences)
  serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  };
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDB = admin.firestore();
export const adminAuth = admin.auth();
