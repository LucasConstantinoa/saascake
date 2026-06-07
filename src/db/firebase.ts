/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Configuração direta do Firebase (chaves públicas do cliente)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-iGRN1fc7N3ycAfdBt3ou-VGbL8hRoQY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "leadsapp-64ad6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "leadsapp-64ad6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "leadsapp-64ad6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "689475906062",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:689475906062:web:a832e85f30eda78672aa5f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-47Z8J0TGL5",
};

const app = initializeApp(firebaseConfig);

// Inicializar Firestore (suporte a variables caso queira mudar no futuro)
const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore multi-tab persistence precondition failed (tab already open).');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported by this browser.');
    }
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  };
}

/**
 * Handle and structure Firestore errors for debugging and logging as mandated
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'custom_username_auth'
    },
    operationType,
    path
  };
  console.error('Firestore Error details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
