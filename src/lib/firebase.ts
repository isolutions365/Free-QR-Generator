/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
let authInstance: any = null;
let dbInstance: any = null;
let isFirebaseConfigured = false;

// Determine if config is customized/real
if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "mock_api_key_placeholder") {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    isFirebaseConfigured = true;
    console.log("Firebase initialized successfully with config:", firebaseConfig.projectId);
  } catch (error) {
    console.error("Firebase failed to initialize:", error);
  }
} else {
  console.log("Using built-in Express server APIs and local state as fallback store (Firebase is unconfigured or in local sandbox mode).");
}

export const auth = authInstance;
export const db = dbInstance;
export const configured = isFirebaseConfigured;

// Test Firestore Connection as suggested by SKILL guidelines
export async function testFirestoreConnection() {
  if (!db || !configured) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test completed.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn("Please check your database connectivity. App is running offline.");
    }
  }
}

// Global Custom Error Handler for Missing Permissions, strictly formatted inside JSON for system diagnostics
export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || "AnonymousLocal",
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || false,
    },
    operationType,
    path
  };
  console.error("Firestore Core Exception Caught:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
export type { User };
