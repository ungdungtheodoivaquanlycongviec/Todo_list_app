const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialization strategy:
// 1) FIREBASE_SERVICE_ACCOUNT (base64 JSON) or FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON)
// 2) FIREBASE_SERVICE_ACCOUNT_PATH (file path)
// 3) GOOGLE_APPLICATION_CREDENTIALS (default SDK env var)

function getServiceAccountFromEnv() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (base64) {
    try {
      const json = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (e) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT base64 JSON');
    }
  }

  if (jsonRaw) {
    try {
      return JSON.parse(jsonRaw);
    } catch (e) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  }

  if (filePath) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    const contents = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(contents);
  }

  return null;
}

if (!admin.apps.length) {
  const sa = getServiceAccountFromEnv();
  if (sa) {
    admin.initializeApp({
      credential: admin.credential.cert(sa)
    });
  } else {
    // Fallback to application default credentials if provided
    admin.initializeApp();
  }
}

module.exports = admin;


