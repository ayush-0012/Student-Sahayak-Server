import * as admin from 'firebase-admin';

// Make sure to add FIREBASE_SERVICE_ACCOUNT_KEY or required env variables in your .env file
// You can get the service account json from Firebase Console -> Project Settings -> Service Accounts
// And set it in .env as a stringified json, e.g. FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

let app: admin.app.App;

if (!admin.apps.length) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountStr) {
      // Parse the JSON string from the environment variable
      const serviceAccount = JSON.parse(serviceAccountStr);
      
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set in environment variables. Initializing with default application credentials.');
      // Fallback to default credentials (e.g. if deployed on GCP/Firebase environments, or GOOGLE_APPLICATION_CREDENTIALS is set)
      app = admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase initialization error', error);
    // Initialize a default instance to avoid crashes if it's not immediately critical
    app = admin.initializeApp();
  }
} else {
  // Use the existing initialization
  app = admin.app();
}

// Export the auth and firestore instances for convenience
export const auth = admin.auth(app);
export const firestore = admin.firestore(app);
export const storage = admin.storage(app);

export default admin;
