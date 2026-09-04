/**
 * Firebase Admin SDK Configuration
 */

import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

let initialized = false;

export function initFirebase(): void {
  if (initialized) return;

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      clientId: process.env.FIREBASE_CLIENT_ID,
      authUri: process.env.FIREBASE_AUTH_URI,
      tokenUri: process.env.FIREBASE_TOKEN_URI,
    };

    if (!serviceAccount.projectId) {
      logger.warn('Firebase: FIREBASE_PROJECT_ID not set — Firebase features disabled');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });

    initialized = true;
    logger.info('Firebase Admin SDK initialized');
  } catch (error) {
    logger.error('Firebase initialization failed:', error);
  }
}

export function getFirestore(): admin.firestore.Firestore {
  if (!initialized) throw new Error('Firebase not initialized');
  return admin.firestore();
}

export function getMessaging(): admin.messaging.Messaging {
  if (!initialized) throw new Error('Firebase not initialized');
  return admin.messaging();
}

export function getAuth(): admin.auth.Auth {
  if (!initialized) throw new Error('Firebase not initialized');
  return admin.auth();
}

export { admin };
