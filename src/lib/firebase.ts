import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missingKeys = requiredKeys.filter((key) => !import.meta.env[key]);

export const firebaseConfigError =
  missingKeys.length > 0 ? `Missing Firebase configuration: ${missingKeys.join(", ")}` : null;

export const firebaseApp: FirebaseApp | null = firebaseConfigError ? null : initializeApp(firebaseConfig);
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const googleAuthProvider = firebaseAuth ? new GoogleAuthProvider() : null;

if (googleAuthProvider) {
  googleAuthProvider.setCustomParameters({ prompt: "select_account" });
}
