import { getApps, getApp, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  if (!config.apiKey || !config.databaseURL) {
    throw new Error(
      "Firebase 환경변수가 설정되지 않았습니다. .env.local.example을 참고해 .env.local을 채워주세요.",
    );
  }
  return initializeApp(config);
}

export function firebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function firebaseDb(): Database {
  return getDatabase(getFirebaseApp());
}
