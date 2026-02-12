import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Import config from a separate file that should be gitignored
// Create firebaseConfig.secret.js with: export default { apiKey: "...", ... }
import firebaseConfigSecret from './firebaseConfig.secret.js';

const firebaseConfig = firebaseConfigSecret;

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


await auth._initializationPromise;

console.log(" Firebase initialized successfully:", app.name);

export { app, db, auth };
